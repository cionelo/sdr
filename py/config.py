"""SDR pipeline configuration."""
import os

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
SDR_VERSION = "0.1.0"
NORMALIZATION_VERSION = "v1.0"

# Feature flags
ALTITUDE_ADJUSTMENT_ENABLED = True
EVENT_CONVERSION_ENABLED = True

# Pipeline defaults
NCAA_ALTITUDE_THRESHOLD_FT = 3000
MILE_TO_1500M_FACTOR = 0.9259
