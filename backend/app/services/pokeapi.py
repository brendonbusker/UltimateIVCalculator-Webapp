from __future__ import annotations

from typing import Dict, List

import httpx

API_TIMEOUT = 15.0
POKEMON_LIST_URL = "https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0"
POKEMON_URL = "https://pokeapi.co/api/v2/pokemon/{name}"
NATURE_URL = "https://pokeapi.co/api/v2/nature/{name}"

pokemon_names_cache: List[str] | None = None
pokemon_cache: Dict[str, dict] = {}
nature_cache: Dict[str, dict] = {}


async def get_pokemon_names() -> List[str]:
    global pokemon_names_cache
    if pokemon_names_cache is not None:
        return pokemon_names_cache
    async with httpx.AsyncClient(timeout=API_TIMEOUT) as client:
        response = await client.get(POKEMON_LIST_URL)
        response.raise_for_status()
        payload = response.json()
        pokemon_names_cache = [item["name"].title() for item in payload.get("results", [])]
        return pokemon_names_cache


async def search_pokemon_names(query: str, limit: int = 10) -> List[str]:
    names = await get_pokemon_names()
    normalized = query.strip().lower()
    if not normalized:
        return names[:limit]

    starts = [name for name in names if name.lower().startswith(normalized)]
    contains = [name for name in names if normalized in name.lower() and name not in starts]
    return (starts + contains)[:limit]


async def get_pokemon(name: str) -> dict:
    key = name.lower().strip()
    if key in pokemon_cache:
        return pokemon_cache[key]
    async with httpx.AsyncClient(timeout=API_TIMEOUT) as client:
        response = await client.get(POKEMON_URL.format(name=key))
        response.raise_for_status()
        payload = response.json()
        pokemon_cache[key] = payload
        return payload


async def get_nature(name: str) -> dict:
    key = name.lower().strip()
    if key in nature_cache:
        return nature_cache[key]
    async with httpx.AsyncClient(timeout=API_TIMEOUT) as client:
        response = await client.get(NATURE_URL.format(name=key))
        response.raise_for_status()
        payload = response.json()
        nature_cache[key] = payload
        return payload


def summarize_pokemon(pokemon: dict) -> dict:
    stat_map = {entry["stat"]["name"]: entry["base_stat"] for entry in pokemon["stats"]}
    types = [entry["type"]["name"].title() for entry in sorted(pokemon.get("types", []), key=lambda x: x["slot"])]
    ability_names = []
    for ability in pokemon.get("abilities", []):
        label = ability["ability"]["name"].replace("-", " ").title()
        if ability.get("is_hidden"):
            label += " (Hidden)"
        ability_names.append(label)

    forms = [form["name"].title() for form in pokemon.get("forms", [])]
    return {
        "name": pokemon["name"].title(),
        "typing": " / ".join(types) if types else "-",
        "abilities": ", ".join(ability_names) if ability_names else "-",
        "size": f"{pokemon.get('height', 0) / 10:.1f} m • {pokemon.get('weight', 0) / 10:.1f} kg",
        "forms": ", ".join(forms[:5]) if forms else "-",
        "base_stats": stat_map,
        "sprites": {
            "default": pokemon.get("sprites", {}).get("front_default"),
            "shiny": pokemon.get("sprites", {}).get("front_shiny"),
        },
    }
