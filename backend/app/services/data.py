import json
import math
import os
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import requests

API_TIMEOUT = 15
POKEMON_LIST_URL = "https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0"
POKEMON_URL = "https://pokeapi.co/api/v2/pokemon/{name}"
NATURE_URL = "https://pokeapi.co/api/v2/nature/{name}"
SPECIES_URL = "https://pokeapi.co/api/v2/pokemon-species/{name}"
HISTORICAL_RAW_URL = "https://raw.githubusercontent.com/zhenga8533/pokedb/data/gen{generation}/pokemon/default/{slug}.json"
BUNDLED_CACHE_PATH = Path(__file__).resolve().parents[1] / "data" / "historical_stats.json"
DEFAULT_RUNTIME_CACHE_PATH = Path(__file__).resolve().parents[2] / ".runtime" / "historical_stats.json"
CACHE_PATH = Path(os.getenv("HISTORICAL_CACHE_PATH", str(DEFAULT_RUNTIME_CACHE_PATH)))
DEFAULT_SEARCHABLE_NAMES_CACHE_PATH = Path(__file__).resolve().parents[2] / ".runtime" / "searchable_pokemon_names.json"
SEARCHABLE_NAMES_CACHE_PATH = Path(os.getenv("SEARCHABLE_POKEMON_CACHE_PATH", str(DEFAULT_SEARCHABLE_NAMES_CACHE_PATH)))

STAT_KEYS = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"]

CHARACTERISTICS: List[Dict[str, object]] = [
    {"name": "No Selection", "stat": None, "modulo": None},
    {"name": "Loves to eat", "stat": "hp", "modulo": 0},
    {"name": "Takes plenty of siestas", "stat": "hp", "modulo": 1},
    {"name": "Nods off a lot", "stat": "hp", "modulo": 2},
    {"name": "Scatters things often", "stat": "hp", "modulo": 3},
    {"name": "Likes to relax", "stat": "hp", "modulo": 4},
    {"name": "Proud of its power", "stat": "attack", "modulo": 0},
    {"name": "Likes to thrash about", "stat": "attack", "modulo": 1},
    {"name": "A little quick tempered", "stat": "attack", "modulo": 2},
    {"name": "Likes to fight", "stat": "attack", "modulo": 3},
    {"name": "Quick tempered", "stat": "attack", "modulo": 4},
    {"name": "Sturdy body", "stat": "defense", "modulo": 0},
    {"name": "Capable of taking hits", "stat": "defense", "modulo": 1},
    {"name": "Highly persistent", "stat": "defense", "modulo": 2},
    {"name": "Good endurance", "stat": "defense", "modulo": 3},
    {"name": "Good perseverance", "stat": "defense", "modulo": 4},
    {"name": "Highly curious", "stat": "special-attack", "modulo": 0},
    {"name": "Mischievous", "stat": "special-attack", "modulo": 1},
    {"name": "Thoroughly cunning", "stat": "special-attack", "modulo": 2},
    {"name": "Often lost in thought", "stat": "special-attack", "modulo": 3},
    {"name": "Very finicky", "stat": "special-attack", "modulo": 4},
    {"name": "Strong willed", "stat": "special-defense", "modulo": 0},
    {"name": "Somewhat vain", "stat": "special-defense", "modulo": 1},
    {"name": "Strongly defiant", "stat": "special-defense", "modulo": 2},
    {"name": "Hates to lose", "stat": "special-defense", "modulo": 3},
    {"name": "Somewhat stubborn", "stat": "special-defense", "modulo": 4},
    {"name": "Likes to run", "stat": "speed", "modulo": 0},
    {"name": "Alert to sounds", "stat": "speed", "modulo": 1},
    {"name": "Impetuous and silly", "stat": "speed", "modulo": 2},
    {"name": "Somewhat of a clown", "stat": "speed", "modulo": 3},
    {"name": "Quick to flee", "stat": "speed", "modulo": 4},
]

_SESSION = requests.Session()
SPECIES_GENERATION_LOOKUP = {"i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5, "vi": 6, "vii": 7, "viii": 8, "ix": 9}
VERSION_GROUP_GENERATION_LOOKUP = {
    "red-blue": 1,
    "yellow": 1,
    "gold-silver": 2,
    "crystal": 2,
    "ruby-sapphire": 3,
    "emerald": 3,
    "firered-leafgreen": 3,
    "colosseum": 3,
    "xd": 3,
    "diamond-pearl": 4,
    "platinum": 4,
    "heartgold-soulsilver": 4,
    "black-white": 5,
    "black-2-white-2": 5,
    "x-y": 6,
    "omega-ruby-alpha-sapphire": 6,
    "sun-moon": 7,
    "ultra-sun-ultra-moon": 7,
    "lets-go-pikachu-lets-go-eevee": 7,
    "sword-shield": 8,
    "brilliant-diamond-and-shining-pearl": 8,
    "legends-arceus": 8,
    "scarlet-violet": 9,
}


def _load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _read_cache() -> dict:
    bundled = _load_json(BUNDLED_CACHE_PATH)
    runtime = _load_json(CACHE_PATH)
    merged = dict(bundled)

    for slug, species_data in runtime.items():
        if isinstance(species_data, dict) and isinstance(merged.get(slug), dict):
            merged[slug] = {**merged[slug], **species_data}
        else:
            merged[slug] = species_data

    return merged


def _write_cache(data: dict) -> None:
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    temp_path = CACHE_PATH.with_suffix(f"{CACHE_PATH.suffix}.tmp")
    temp_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    temp_path.replace(CACHE_PATH)


def _load_string_list(path: Path) -> List[str]:
    if not path.exists():
        return []
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return []
    if not isinstance(payload, list):
        return []
    return [item for item in payload if isinstance(item, str)]


def _write_string_list(path: Path, values: List[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_suffix(f"{path.suffix}.tmp")
    temp_path.write_text(json.dumps(values, indent=2), encoding="utf-8")
    temp_path.replace(path)


@lru_cache(maxsize=1)
def get_pokemon_names() -> List[str]:
    response = _SESSION.get(POKEMON_LIST_URL, timeout=API_TIMEOUT)
    response.raise_for_status()
    payload = response.json()
    return [item["name"].title() for item in payload.get("results", [])]


@lru_cache(maxsize=2048)
def get_pokemon(name: str) -> dict:
    response = _SESSION.get(POKEMON_URL.format(name=name.lower().strip()), timeout=API_TIMEOUT)
    response.raise_for_status()
    return response.json()


@lru_cache(maxsize=2048)
def get_pokemon_form(name: str) -> dict:
    pokemon = get_pokemon(name)
    forms = pokemon.get("forms", [])
    if not forms:
        return {}

    response = _SESSION.get(forms[0]["url"], timeout=API_TIMEOUT)
    response.raise_for_status()
    return response.json()


@lru_cache(maxsize=256)
def get_species(name: str) -> dict:
    response = _SESSION.get(SPECIES_URL.format(name=name.lower().strip()), timeout=API_TIMEOUT)
    response.raise_for_status()
    return response.json()


@lru_cache(maxsize=64)
def get_nature(name: str) -> dict:
    response = _SESSION.get(NATURE_URL.format(name=name.lower().strip()), timeout=API_TIMEOUT)
    response.raise_for_status()
    return response.json()


def _normalize_historical_stats(stats: dict, generation: int) -> Dict[str, int]:
    hp = int(stats.get("hp", 0))
    attack = int(stats.get("attack", 0))
    defense = int(stats.get("defense", 0))
    speed = int(stats.get("speed", 0))
    sp_atk = int(stats.get("special_attack", stats.get("special-attack", 0)))
    sp_def = int(stats.get("special_defense", stats.get("special-defense", 0)))
    if generation == 1:
        special = sp_atk or sp_def
        sp_atk = special
        sp_def = special
    return {
        "hp": hp,
        "attack": attack,
        "defense": defense,
        "special-attack": sp_atk,
        "special-defense": sp_def,
        "speed": speed,
    }


def get_historical_base_stats(name: str, generation: int) -> Optional[Dict[str, int]]:
    slug = name.lower().strip()
    cache = _read_cache()
    species_data = cache.get(slug, {})
    gen_key = str(generation)
    if gen_key in species_data:
        return species_data[gen_key]

    try:
        response = _SESSION.get(HISTORICAL_RAW_URL.format(generation=generation, slug=slug), timeout=API_TIMEOUT)
        if response.status_code != 200:
            return None
        payload = response.json()
        stats = _normalize_historical_stats(payload.get("stats", {}), generation)
        species_data[gen_key] = stats
        cache[slug] = species_data
        _write_cache(cache)
        return stats
    except Exception:
        return None


def pokemon_summary(name: str, generation: Optional[int] = None) -> Dict[str, object]:
    pokemon = get_pokemon(name)
    stat_map = {entry["stat"]["name"]: entry["base_stat"] for entry in pokemon["stats"]}
    base_stats = {key: stat_map.get(key, 0) for key in STAT_KEYS}

    if generation is not None:
        historical = get_historical_base_stats(name, generation)
        if historical:
            base_stats = historical

    return {
        "name": pokemon["name"].title(),
        "types": [entry["type"]["name"].title() for entry in sorted(pokemon.get("types", []), key=lambda x: x["slot"])],
        "abilities": [
            (ability["ability"]["name"].replace("-", " ").title() + (" (Hidden)" if ability.get("is_hidden") else ""))
            for ability in pokemon.get("abilities", [])
        ],
        "height_m": pokemon.get("height", 0) / 10,
        "weight_kg": pokemon.get("weight", 0) / 10,
        "forms": [form["name"].title() for form in pokemon.get("forms", [])],
        "base_stats": base_stats,
        "sprites": {
            "default": pokemon.get("sprites", {}).get("front_default"),
            "shiny": pokemon.get("sprites", {}).get("front_shiny"),
        },
    }


def _species_generation_to_int(species: dict) -> int:
    generation_name = species["generation"]["name"]
    roman = generation_name.split("-")[-1]
    return SPECIES_GENERATION_LOOKUP[roman]


def introduced_generation(name: str) -> int:
    try:
        return _species_generation_to_int(get_species(name))
    except requests.HTTPError:
        form = get_pokemon_form(name)
        version_group_name = form.get("version_group", {}).get("name")
        if version_group_name in VERSION_GROUP_GENERATION_LOOKUP:
            return VERSION_GROUP_GENERATION_LOOKUP[version_group_name]

        species_name = get_pokemon(name).get("species", {}).get("name")
        if species_name:
            return _species_generation_to_int(get_species(species_name))
        raise


def is_searchable_pokemon(name: str) -> bool:
    if "-" not in name:
        return True

    try:
        form = get_pokemon_form(name)
    except requests.HTTPError:
        return True

    return not form.get("is_battle_only") and not form.get("is_mega")


@lru_cache(maxsize=1)
def get_searchable_pokemon_names() -> List[str]:
    cached_names = _load_string_list(SEARCHABLE_NAMES_CACHE_PATH)
    if cached_names:
        return cached_names

    filtered_names = [name for name in get_pokemon_names() if is_searchable_pokemon(name)]
    _write_string_list(SEARCHABLE_NAMES_CACHE_PATH, filtered_names)
    return filtered_names


def nature_modifiers(nature_name: Optional[str]) -> Dict[str, float]:
    modifiers = {key: 1.0 for key in STAT_KEYS}
    if not nature_name:
        return modifiers
    nature = get_nature(nature_name)
    inc = nature.get("increased_stat")
    dec = nature.get("decreased_stat")
    if inc is not None:
        modifiers[inc["name"]] = 1.1
    if dec is not None:
        modifiers[dec["name"]] = 0.9
    return modifiers


def characteristic_meta(name: Optional[str]) -> Tuple[Optional[str], Optional[int]]:
    if not name or name == "No Selection":
        return None, None
    for entry in CHARACTERISTICS:
        if entry["name"] == name:
            return entry["stat"], entry["modulo"]
    return None, None


def old_gen_effort_term(stat_exp: int) -> int:
    stat_exp = max(0, min(65535, stat_exp))
    return math.floor(math.ceil(math.sqrt(stat_exp)) / 4)
