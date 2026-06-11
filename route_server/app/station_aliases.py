import re


ALIAS_GROUPS = [
    {"총신대입구", "이수"},
]


def normalize_station_key(value):
    """Return a compact station key for alias matching."""
    text = str(value or "").strip().lower()
    text = re.sub(r"\s+", "", text)
    text = text.replace("（", "(").replace("）", ")")
    text = re.sub(r"역$", "", text)
    return text


def station_name_tokens(value):
    """Return searchable station-name tokens from one id or display name."""
    text = str(value or "").strip()
    if not text:
        return set()
    tokens = {normalize_station_key(text)}
    for content in re.findall(r"\(([^)]*)\)", text):
        tokens.add(normalize_station_key(content))
    without_parentheses = re.sub(r"\([^)]*\)", "", text)
    tokens.add(normalize_station_key(without_parentheses))
    return {token for token in tokens if token}


def expand_alias_tokens(tokens):
    """Expand known station aliases such as 총신대입구/이수."""
    expanded = set(tokens)
    for group in ALIAS_GROUPS:
        normalized_group = {normalize_station_key(item) for item in group}
        if expanded & normalized_group:
            expanded |= normalized_group
    return expanded


def station_alias_tokens(*values):
    """Return all station alias tokens for matching."""
    tokens = set()
    for value in values:
        tokens |= station_name_tokens(value)
    return expand_alias_tokens(tokens)

