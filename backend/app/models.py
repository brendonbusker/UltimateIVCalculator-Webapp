from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

STAT_KEYS = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"]
STAT_LABELS = {
    "hp": "HP",
    "attack": "ATK",
    "defense": "DEF",
    "special-attack": "SPATK",
    "special-defense": "SPDEF",
    "speed": "SPD",
}
STAT_COLORS = {
    "hp": "#FF5959",
    "attack": "#F5AC78",
    "defense": "#FAE078",
    "special-attack": "#9DB7F5",
    "special-defense": "#A7DB8D",
    "speed": "#FA92B2",
}
NEUTRAL_NATURES = {"hardy", "docile", "bashful", "quirky", "serious"}
NATURES = [
    "Adamant", "Bashful", "Bold", "Brave", "Calm", "Careful", "Docile", "Gentle",
    "Hardy", "Hasty", "Impish", "Jolly", "Lax", "Lonely", "Mild", "Modest", "Naive",
    "Naughty", "Quiet", "Quirky", "Rash", "Relaxed", "Sassy", "Serious", "Timid",
]


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
    level: int = Field(ge=1, le=100)
    nature: str = Field(min_length=1)
    observed_stats: StatBlock
    evs: StatBlock

    @field_validator("nature")
    @classmethod
    def normalize_nature(cls, value: str) -> str:
        value = value.strip().lower()
        if value.title() not in NATURES:
            raise ValueError("Unsupported nature.")
        return value

    @field_validator("pokemon_name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        return value.strip()

    @field_validator("evs")
    @classmethod
    def validate_evs(cls, value: StatBlock) -> StatBlock:
        values = value.by_api_key()
        if any(v < 0 or v > 255 for v in values.values()):
            raise ValueError("Each EV must be between 0 and 255.")
        if sum(values.values()) > 510:
            raise ValueError("Total EVs cannot exceed 510.")
        return value


class PokemonSearchResult(BaseModel):
    name: str


class PokemonSummary(BaseModel):
    name: str
    display_name: str
    base_stats: Dict[str, int]
    types: List[str]
    abilities: List[str]
    forms: List[str]
    height_m: float
    weight_kg: float
    sprites: Dict[str, Optional[str]]


class StatResult(BaseModel):
    stat_key: str
    label: str
    color: str
    base_stat: int
    observed_stat: int
    ev: int
    matches: List[int]
    range_text: str
    quality: str
    best_match: Optional[int]
    perfect_possible: bool
    impossible: bool


class CalculateResponse(BaseModel):
    pokemon: PokemonSummary
    level: int
    nature: str
    best_stat_summary: str
    perfect_iv_summary: str
    impossible_count: int
    status: str
    results: Dict[str, StatResult]


class ErrorResponse(BaseModel):
    detail: str


AppearanceMode = Literal["system", "light", "dark"]
