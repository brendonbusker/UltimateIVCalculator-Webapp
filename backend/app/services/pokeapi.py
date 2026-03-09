from __future__ import annotations

from typing import Dict, List, Optional

import httpx
from cachetools import TTLCache
from fastapi import HTTPException

from app.models import PokemonSummary

API_TIMEOUT = 15
POKEMON_LIST_URL = "https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0"
POKEMON_URL = "https://pokeapi.co/api/v2/pokemon/{name}"
NATURE_URL = "https://pokeapi.co/api/v2/nature/{name}"


class PokeAPIService:
    def __init__(self) -> None:
        self._pokemon_cache: TTLCache[str, dict] = TTLCache(maxsize=512, ttl=60 * 60)
        self._nature_cache: TTLCache[str, dict] = TTLCache(maxsize=64, ttl=60 * 60)
        self._pokemon_names_cache: Optional[List[str]] = None

    async def _get_json(self, url: str) -> dict:
        async with httpx.AsyncClient(timeout=API_TIMEOUT) as client:
            response = await client.get(url)
        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="Resource not found.")
        response.raise_for_status()
        return response.json()

    async def get_pokemon_names(self) -> List[str]:
        if self._pokemon_names_cache is not None:
            return self._pokemon_names_cache
        payload = await self._get_json(POKEMON_LIST_URL)
        self._pokemon_names_cache = [item["name"].title() for item in payload.get("results", [])]
        return self._pokemon_names_cache

    async def search_pokemon_names(self, query: str, limit: int = 10) -> List[str]:
        names = await self.get_pokemon_names()
        normalized = query.strip().lower()
        if not normalized:
            return names[:limit]

        starts_with = [name for name in names if name.lower().startswith(normalized)]
        contains = [name for name in names if normalized in name.lower() and name not in starts_with]
        return (starts_with + contains)[:limit]

    async def get_pokemon(self, name: str) -> dict:
        key = name.lower().strip()
        if key not in self._pokemon_cache:
            self._pokemon_cache[key] = await self._get_json(POKEMON_URL.format(name=key))
        return self._pokemon_cache[key]

    async def get_nature(self, name: str) -> dict:
        key = name.lower().strip()
        if key not in self._nature_cache:
            self._nature_cache[key] = await self._get_json(NATURE_URL.format(name=key))
        return self._nature_cache[key]

    def build_summary(self, pokemon: dict) -> PokemonSummary:
        stat_map = {entry["stat"]["name"]: entry["base_stat"] for entry in pokemon["stats"]}
        types = [entry["type"]["name"].title() for entry in sorted(pokemon.get("types", []), key=lambda x: x["slot"])]

        abilities: List[str] = []
        for ability in pokemon.get("abilities", []):
            label = ability["ability"]["name"].replace("-", " ").title()
            if ability.get("is_hidden"):
                label += " (Hidden)"
            abilities.append(label)

        forms = [form["name"].title() for form in pokemon.get("forms", [])]

        return PokemonSummary(
            name=pokemon["name"],
            display_name=pokemon["name"].title(),
            base_stats=stat_map,
            types=types,
            abilities=abilities,
            forms=forms,
            height_m=pokemon.get("height", 0) / 10,
            weight_kg=pokemon.get("weight", 0) / 10,
            sprites={
                "default": pokemon.get("sprites", {}).get("front_default"),
                "shiny": pokemon.get("sprites", {}).get("front_shiny"),
            },
        )
