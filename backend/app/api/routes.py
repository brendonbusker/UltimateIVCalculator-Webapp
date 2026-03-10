from typing import List

from fastapi import APIRouter, HTTPException, Query
import requests

from app.models.schemas import CalculateRequest, CalculateResponse, PokemonSummary, SearchResult
from app.services.calculator import calculate
from app.services.data import CHARACTERISTICS, get_searchable_pokemon_names, pokemon_summary

router = APIRouter()

NATURES = [
    "Adamant", "Bashful", "Bold", "Brave", "Calm", "Careful", "Docile", "Gentle",
    "Hardy", "Hasty", "Impish", "Jolly", "Lax", "Lonely", "Mild", "Modest", "Naive",
    "Naughty", "Quiet", "Quirky", "Rash", "Relaxed", "Sassy", "Serious", "Timid",
]


@router.get("/health")
def health() -> dict:
    return {"ok": True}


@router.get("/meta/generations")
def generations() -> dict:
    return {"generations": [{"value": i, "label": f"Generation {i}"} for i in range(1, 10)]}


@router.get("/meta/characteristics")
def characteristics() -> dict:
    return {"characteristics": [entry["name"] for entry in CHARACTERISTICS]}


@router.get("/meta/natures")
def natures() -> dict:
    return {"natures": NATURES}


@router.get("/pokemon/search", response_model=List[SearchResult])
def search_pokemon(
    q: str = Query("", min_length=0, max_length=100),
    limit: int = Query(12, ge=0, le=2000),
) -> List[SearchResult]:
    names = sorted(get_searchable_pokemon_names(), key=str.casefold)
    q = q.strip().lower()
    results = names if not q else [name for name in names if q in name.lower()]
    if limit:
        results = results[:limit]
    return [SearchResult(name=name) for name in results]


@router.get("/pokemon/{name}", response_model=PokemonSummary)
def pokemon(name: str, generation: int | None = None) -> PokemonSummary:
    try:
        return PokemonSummary(**pokemon_summary(name, generation))
    except requests.HTTPError as exc:
        raise HTTPException(status_code=404, detail="Pokemon not found.") from exc


@router.post("/calculate", response_model=CalculateResponse)
def calculate_endpoint(payload: CalculateRequest) -> CalculateResponse:
    try:
        result = calculate(
            pokemon_name=payload.pokemon_name,
            generation=payload.generation,
            level=payload.level,
            nature_name=payload.nature,
            characteristic_name=payload.characteristic,
            observed_stats=payload.observed_stats.by_api_key(),
            effort_values=payload.effort_values.by_api_key(),
        )
        return CalculateResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except requests.HTTPError as exc:
        raise HTTPException(status_code=404, detail="Pokemon or nature lookup failed.") from exc
