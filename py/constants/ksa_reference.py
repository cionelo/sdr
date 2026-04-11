"""Reference KsA values from Blödorn & Döring (2025) research.

Male baselines: Scientific Reports, 14,000+ race times
Female baselines: BMC Research Notes, 20,000+ race times
"""

# Median KsA values by distance pair and sex
# KsA = pace_shorter / pace_longer (higher = stronger endurance)
KSA_REFERENCE = {
    "male": {
        "400_800": 0.888,
        "800_1500": 0.921,
        "1500_3000": 0.923,
        "3000_5000": 0.967,
        "5000_10000": 0.954,
    },
    "female": {
        "400_800": 0.880,
        "800_1500": 0.915,
        "1500_3000": 0.926,
        "3000_5000": 0.963,
        "5000_10000": 0.956,
    },
}

# Archetype classification thresholds
ARCHETYPE_AEROBIC_THRESHOLD = 1.10
ARCHETYPE_ANAEROBIC_THRESHOLD = 0.90
