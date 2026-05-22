In Entra ID (entra.microsoft.com), here's how to add Mail.Send:

Go to your app registration
App registrations → find your app → click it
Add the API permission
Left nav: API permissions → + Add a permission
Select Microsoft Graph → Application permissions
Search Mail.Send, check the box, click Add permissions
Grant admin consent
Still on API permissions page
Click Grant admin consent for [tenant] → Confirm Yes
Status column should flip to a green checkmark
Verify
Ensure the table shows Microsoft Graph → Mail.Send with a green check under Status
If it's a delegated permission instead:

In step 2, pick Delegated permissions and add Mail.Send
No admin consent required for delegated, but users must sign in with the correct scopes
Common pitfall: Without admin consent, the token request will fail with AADSTS65001: The user or administrator has not consented to use the application. Granting admin consent is the step most people miss.

Also make sure your app reg has a client secret (Certificates & secrets → + New client secret) — your ECHO service will need both the client_id, client_secret, and tenant_id for the client credentials flow.