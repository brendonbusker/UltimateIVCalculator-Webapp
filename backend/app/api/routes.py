from __future__ import annotations

from fastapi import APIRouter, Query

from app.models import CalculateRequest, CalculateResponse, PokemonSummary
from app.services.calculator import IVCalculatorService
from app.services.pokeapi import PokeAPIService

router = APIRouter()
pokeapi_service = PokeAPIService()
calculator_service = IVCalculatorService(pokeapi_service)


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/pokemon/search")
async def search_pokemon(q: str = Query(default="", max_length=100), limit: int = Query(default=10, ge=1, le=20)) -> dict[str, list[str]]:
    return {"results": await pokeapi_service.search_pokemon_names(q, limit=limit)}


@router.get("/pokemon/{name}", response_model=PokemonSummary)
async def get_pokemon(name: str) -> PokemonSummary:
    pokemon = await pokeapi_service.get_pokemon(name)
    return pokeapi_service.build_summary(pokemon)


@router.post("/calculate", response_model=CalculateResponse)
async def calculate(payload: CalculateRequest) -> CalculateResponse:
    return await calculator_service.calculate(payload)
