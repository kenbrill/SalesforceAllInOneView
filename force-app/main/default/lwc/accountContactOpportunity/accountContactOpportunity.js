import { LightningElement, wire } from 'lwc';
import getAccountData from '@salesforce/apex/AccountContactOpportunityController.getAccountData';

const formatCurrency = (amount) => {
    if (amount == null) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

export default class AccountContactOpportunity extends LightningElement {
    accounts = [];
    isLoading = true;
    hasError = false;
    errorMessage = '';

    // Single @wire call — Apex returns the full Account → Contact → Opportunity tree
    @wire(getAccountData)
    wiredData({ data, error }) {
        this.isLoading = false;

        if (data) {
            this.hasError = false;
            this.accounts = data.map(acc => ({
                id: acc.id,
                name: acc.name,
                hasContacts: acc.contacts.length > 0,
                contacts: acc.contacts.map(con => ({
                    id: con.id,
                    fullName: con.fullName,
                    email: con.email,
                    hasOpportunities: con.opportunities.length > 0,
                    opportunities: con.opportunities.map(opp => ({
                        id: opp.id,
                        name: opp.name,
                        amount: formatCurrency(opp.amount)
                    }))
                }))
            }));
        }

        if (error) {
            this.hasError = true;
            this.errorMessage = error.body?.message ?? 'Unknown error';
            this.accounts = [];
        }
    }

    get isEmpty() {
        return this.accounts.length === 0;
    }
}
