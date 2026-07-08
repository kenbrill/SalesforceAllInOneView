public with sharing class AccountContactOpportunityController {

    public class AccountWrapper {
        @AuraEnabled public String id;
        @AuraEnabled public String name;
        @AuraEnabled public List<ContactWrapper> contacts;
    }

    public class ContactWrapper {
        @AuraEnabled public String id;
        @AuraEnabled public String fullName;
        @AuraEnabled public String email;
        @AuraEnabled public List<OpportunityWrapper> opportunities;
    }

    public class OpportunityWrapper {
        @AuraEnabled public String id;
        @AuraEnabled public String name;
        @AuraEnabled public Decimal amount;
    }

    @AuraEnabled(cacheable=true)
    public static List<AccountWrapper> getAccountData() {
        Id currentUserId = UserInfo.getUserId();

        // Query 1: Accounts owned by the running user, with related Contacts
        List<Account> accounts = [
            SELECT Id, Name,
                (SELECT Id, FirstName, LastName, Email FROM Contacts ORDER BY LastName ASC)
            FROM Account
            WHERE OwnerId = :currentUserId
            ORDER BY Name ASC
        ];

        // Collect Contact IDs for the second query (no SOQL in loops)
        Set<Id> contactIds = new Set<Id>();
        for (Account acc : accounts) {
            for (Contact con : acc.Contacts) {
                contactIds.add(con.Id);
            }
        }

        // Query 2: OpportunityContactRoles for all collected Contacts
        Map<Id, List<OpportunityWrapper>> oppsByContactId = new Map<Id, List<OpportunityWrapper>>();
        if (!contactIds.isEmpty()) {
            for (OpportunityContactRole ocr : [
                SELECT ContactId, Opportunity.Id, Opportunity.Name, Opportunity.Amount
                FROM OpportunityContactRole
                WHERE ContactId IN :contactIds
                ORDER BY Opportunity.Name ASC
            ]) {
                if (!oppsByContactId.containsKey(ocr.ContactId)) {
                    oppsByContactId.put(ocr.ContactId, new List<OpportunityWrapper>());
                }
                OpportunityWrapper oppWrap = new OpportunityWrapper();
                oppWrap.id = ocr.Opportunity.Id;
                oppWrap.name = ocr.Opportunity.Name;
                oppWrap.amount = ocr.Opportunity.Amount;
                oppsByContactId.get(ocr.ContactId).add(oppWrap);
            }
        }

        // Build nested result structure
        List<AccountWrapper> result = new List<AccountWrapper>();
        for (Account acc : accounts) {
            AccountWrapper accWrap = new AccountWrapper();
            accWrap.id = acc.Id;
            accWrap.name = acc.Name;
            accWrap.contacts = new List<ContactWrapper>();

            for (Contact con : acc.Contacts) {
                ContactWrapper conWrap = new ContactWrapper();
                conWrap.id = con.Id;
                conWrap.fullName = ((con.FirstName != null ? con.FirstName + ' ' : '')
                    + (con.LastName != null ? con.LastName : '')).trim();
                conWrap.email = con.Email != null ? con.Email : '';
                conWrap.opportunities = oppsByContactId.containsKey(con.Id)
                    ? oppsByContactId.get(con.Id)
                    : new List<OpportunityWrapper>();
                accWrap.contacts.add(conWrap);
            }
            result.add(accWrap);
        }

        return result;
    }
}
