import { LightningElement, wire } from 'lwc';
import { gql, graphql } from 'lightning/uiGraphQLAPI';
import userId from '@salesforce/user/Id';

const QUERY = gql`
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
`;

export default class AccountContactOpportunity extends LightningElement {
    accounts = [];
    isLoading = true;
    hasError = false;
    errorMessage = '';

    @wire(graphql, {
        query: QUERY,
        variables: '$graphqlVariables'
    })
    wiredData({ data, errors }) {
        this.isLoading = false;

        if (data) {
            this.hasError = false;
            this.accounts = data.uiapi.query.Account.edges.map(({ node: acc }) => {
                const contacts = acc.Contacts.edges.map(({ node: con }) => {
                    const opportunities = con.OpportunityContactRoles.edges.map(({ node: ocr }) => ({
                        id: ocr.Id,
                        name: ocr.Opportunity.Name.value,
                        amount: ocr.Opportunity.Amount?.displayValue
                            ?? ocr.Opportunity.Amount?.value?.toString()
                            ?? 'N/A'
                    }));
                    return {
                        id: con.Id,
                        fullName: [con.FirstName?.value, con.LastName?.value]
                            .filter(Boolean)
                            .join(' '),
                        email: con.Email?.value ?? '',
                        opportunities,
                        hasOpportunities: opportunities.length > 0
                    };
                });
                return {
                    id: acc.Id,
                    name: acc.Name.value,
                    contacts,
                    hasContacts: contacts.length > 0
                };
            });
        }

        if (errors) {
            this.hasError = true;
            this.errorMessage = errors.map(e => e.message).join(', ');
            this.accounts = [];
        }
    }

    get graphqlVariables() {
        return { userId };
    }

    get isEmpty() {
        return this.accounts.length === 0;
    }
}
