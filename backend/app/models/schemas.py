from typing import Dict, List, Optional

from pydantic import BaseModel, Field, model_validator


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


class StatBlock(BaseModel):
    hp: int
    attack: int
    defense: int
    special_attack: int = Field(alias="special-attack")
    special_defense: int = Field(alias="special-defense")
    speed: int

    model_config = {"populate_by_name": True}

    def by_api_key(self) -> Dict[str, int]:
        return {
            "hp": self.hp,
            "attack": self.attack,
            "defense": self.defense,
            "special-attack": self.special_attack,
            "special-defense": self.special_defense,
            "speed": self.speed,
        }


class CalculateRequest(BaseModel):
    pokemon_name: str = Field(min_length=1)
    generation: int = Field(ge=1, le=9)
    level: int = Field(ge=1, le=100)
    nature: Optional[str] = None
    characteristic: Optional[str] = None
    observed_stats: StatBlock
    effort_values: StatBlock

    @model_validator(mode="after")
    def validate_stat_ranges(self) -> "CalculateRequest":
        observed = self.observed_stats.by_api_key()
        effort_values = self.effort_values.by_api_key()

        if any(value < 0 or value > 999 for value in observed.values()):
            raise ValueError("Observed stats must be between 0 and 999.")

        effort_cap = 65535 if self.generation <= 2 else 255
        if any(value < 0 or value > effort_cap for value in effort_values.values()):
            raise ValueError(f"Each {'Stat Exp' if self.generation <= 2 else 'EV'} value must be between 0 and {effort_cap}.")

        if self.generation >= 3 and sum(effort_values.values()) > 510:
            raise ValueError("Total EVs cannot exceed 510.")

        return self


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
