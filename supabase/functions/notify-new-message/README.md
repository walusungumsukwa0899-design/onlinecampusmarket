# notify-new-message

Sends a push notification (and inbox record) to the recipient whenever a new message is inserted.

## Setup

1. Deploy the function:
   ```
   supabase functions deploy notify-new-message
   ```

2. In Supabase Dashboard → Database → Webhooks, create a new webhook:
   - **Name**: notify-new-message
   - **Table**: messages
   - **Events**: INSERT
   - **Type**: Supabase Edge Functions
   - **Function**: notify-new-message

That's it. No API key needed — the function uses the service role key from environment secrets.
