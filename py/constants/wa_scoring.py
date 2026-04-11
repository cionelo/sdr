"""World Athletics scoring table coefficients (2025 edition).

Source: Jeff Chen's quadratic regression on WA scoring tables
https://github.com/jchen1/iaaf-scoring-tables
Data file: coefficients-2025.json

Formula: P = a * T² + b * T + c
Where T is finish time in seconds.

The coefficients are produced by degree-2 polynomial regression
(mark → points) on the official WA scoring PDF tables.
"""

from typing import NamedTuple


class WACoefficients(NamedTuple):
    """Quadratic coefficients for P = a*T² + b*T + c."""

    a: float
    b: float
    c: float


# (event, sex) -> WACoefficients(a, b, c)
# Extracted from coefficients-2025.json (jchen1/iaaf-scoring-tables @ master)
WA_COEFFICIENTS: dict[tuple[str, str], WACoefficients] = {
    # ── 800m ─────────────────────────────────────────────────────────
    ("800m", "male"): WACoefficients(
        a=0.1980049254166545,
        b=-72.07136038821409,
        c=6558.28160300618,
    ),
    ("800m", "female"): WACoefficients(
        a=0.06879989341997295,
        b=-34.399261916380055,
        c=4299.822125108796,
    ),
    # ── 1500m ────────────────────────────────────────────────────────
    ("1500m", "male"): WACoefficients(
        a=0.04065992529984008,
        b=-31.307736299477256,
        c=6026.662254345021,
    ),
    ("1500m", "female"): WACoefficients(
        a=0.01339999627048627,
        b=-14.471861176560651,
        c=3907.3655835949467,
    ),
    # ── 3000m ────────────────────────────────────────────────────────
    ("3000m", "male"): WACoefficients(
        a=0.008150049932713843,
        b=-13.691983542337312,
        c=5750.59246378555,
    ),
    ("3000m", "female"): WACoefficients(
        a=0.0025389974609562604,
        b=-6.09357042856243,
        c=3656.127933666052,
    ),
    # ── 3000m Steeplechase ───────────────────────────────────────────
    ("3000m_steeple", "male"): WACoefficients(
        a=0.0043159973458793965,
        b=-8.804593368752649,
        c=4490.321079731511,
    ),
    ("3000m_steeple", "female"): WACoefficients(
        a=0.0013229981350130343,
        b=-3.99544233512367,
        c=3016.5498521791887,
    ),
    # ── 5000m ────────────────────────────────────────────────────────
    ("5000m", "male"): WACoefficients(
        a=0.002777997945427213,
        b=-8.000608112196687,
        c=5760.418712362531,
    ),
    ("5000m", "female"): WACoefficients(
        a=8.079992470730324e-04,
        b=-3.3935897885437782,
        c=3563.2616780022654,
    ),
    # ── 10000m ───────────────────────────────────────────────────────
    ("10000m", "male"): WACoefficients(
        a=5.239994429364625e-04,
        b=-3.3011925260043427,
        c=5199.371486475808,
    ),
    ("10000m", "female"): WACoefficients(
        a=1.712000450308747e-04,
        b=-1.5407985033832432,
        c=3466.7925173026015,
    ),
}
