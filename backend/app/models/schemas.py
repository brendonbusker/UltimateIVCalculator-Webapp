
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class SearchResult(BaseModel):
    name: str


class PokemonSummary(BaseModel):
    name: str
    types: List[str]
    abilities: List[str]
    height_m: float
    weight_kg: float
    forms: List[str]
    base_stats: Dict[str, int]
    sprites: Dict[str, Optional[str]]


class CalculateRequest(BaseModel):
    pokemon_name: str = Field(min_length=1)
    generation: int = Field(ge=1, le=9)
    level: int = Field(ge=1, le=100)
    nature: Optional[str] = None
    characteristic: Optional[str] = None
    observed_stats: Dict[str, int]
    effort_values: Dict[str, int]


class CalculateResponse(BaseModel):
    generation: int
    pokemon: PokemonSummary
    iv_ranges: Dict[str, str]
    quality: Dict[str, str]
    bars: Dict[str, float]
    exact_values: Dict[str, List[int]]
    best_match: str
    perfect_stats: List[str]
    status: str
    generation_notes: List[str]
