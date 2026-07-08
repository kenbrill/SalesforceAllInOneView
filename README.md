# Salesforce All-In-One View

An academic Lightning Web Component (LWC) built to demonstrate the power of the Salesforce GraphQL API — specifically its ability to retrieve a deeply nested, multi-object data structure in a single API call.

## What This Shows

Traditional Salesforce development often requires multiple round-trips to retrieve related data across objects. This component demonstrates how the GraphQL API eliminates that pattern entirely by expressing the full data hierarchy as a single query:

```
Account (owned by current user, ordered by Name)
  └── Contacts (ordered by Last Name)
        └── OpportunityContactRoles
              └── Opportunity (Name, Amount)
```

One call. One response. The entire tree.

## The Component

`accountContactOpportunity` renders a three-level accordion in Lightning Experience:

| Level | Object | Fields Displayed |
|-------|--------|-----------------|
| 1 | Account | Name |
| 2 | Contact | Full Name, Email |
| 3 | Opportunity | Name, Amount |

- Accounts are filtered to those **owned by the currently logged-in user**
- Each level is independently expandable
- Empty states are handled gracefully at every level

## Data Model

The Contact → Opportunity relationship in Salesforce is not direct — it goes through the `OpportunityContactRole` junction object. The GraphQL query traverses this relationship automatically, making what would normally require complex joins or multiple queries trivially expressible:

```graphql
query AccountsForCurrentUser($userId: ID) {
  uiapi {
    query {
      Account(
        where: { OwnerId: { eq: $userId } }
        orderBy: { Name: { order: ASC } }
      ) {
        edges {
          node {
            Id
            Name { value }
            Contacts {
              edges {
                node {
                  Id
                  FirstName { value }
                  LastName { value }
                  Email { value }
                  OpportunityContactRoles {
                    edges {
                      node {
                        Id
                        Opportunity {
                          Id
                          Name { value }
                          Amount { value displayValue }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## Project Structure

```
force-app/main/default/
  lwc/
    accountContactOpportunity/
      accountContactOpportunity.html      # Three-level accordion UI
      accountContactOpportunity.js        # Single @wire call
      accountContactOpportunity.js-meta.xml
  classes/
    AccountContactOpportunityController.cls          # Apex wire controller
    AccountContactOpportunityController.cls-meta.xml
```

## Prerequisites

- Salesforce CLI (`sf`)
- A Salesforce Developer Edition org
- API version 55.0 or higher (GraphQL API requirement)

## Deployment

```bash
# Authenticate your org
sf org login web --alias MYORG

# Deploy
sf project deploy start --source-dir force-app --target-org MYORG
```

Then add the component to any Lightning App, Home, or Record page via Lightning App Builder.

## Sample Data

To see the full hierarchy in action, each Contact must have at least one `OpportunityContactRole` linking it to an Opportunity. In Salesforce, this is created via the **Contact Roles** related list on an Opportunity record, or via Anonymous Apex:

```apex
OpportunityContactRole ocr = new OpportunityContactRole(
    OpportunityId = [SELECT Id FROM Opportunity WHERE Name = 'Your Opp' LIMIT 1].Id,
    ContactId     = [SELECT Id FROM Contact WHERE LastName = 'Smith' LIMIT 1].Id,
    Role          = 'Decision Maker'
);
insert ocr;
```

## Purpose

This is a purely academic project. It exists to illustrate a single principle: that the GraphQL API can express complex, multi-level Salesforce object relationships as one declarative query — reducing network overhead, simplifying component logic, and eliminating the need for multiple `@wire` calls or imperative chaining.
