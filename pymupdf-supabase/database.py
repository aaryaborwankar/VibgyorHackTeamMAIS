
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.environ["SUPABASE_URL"]

# Use a server-only secret key, never expose it to the browser.
key = os.environ["SUPABASE_KEY"]

supabase = create_client(url, key)
