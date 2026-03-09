from __future__ import annotations

from typing import Dict, List

from app.models import (
    CalculateRequest,
    CalculateResponse,
    NEUTRAL_NATURES,
    STAT_COLORS,
    STAT_KEYS,
    STAT_LABELS,
    StatResult,
)
from app.services.pokeapi import PokeAPIService


class IVCalculatorService:
    def __init__(self, pokeapi_service: PokeAPIService) -> None:
        self.pokeapi_service = pokeapi_service

    @staticmethod
    def calculate_stat(stat_key: str, base_stat: int, iv: int, ev: int, level: int, nature_modifier: float) -> int:
        ev_term = ev // 4
        if stat_key == "hp":
            if base_stat == 1:
                return 1
            return ((2 * base_stat + iv + ev_term) * level) // 100 + level + 10

        raw_stat = ((2 * base_stat + iv + ev_term) * level) // 100 + 5
        return int(raw_stat * nature_modifier)

    @staticmethod
    def describe_iv_quality(best_iv: int, match_count: int) -> str:
        if match_count > 8:
            return "Wide range"
        if best_iv == 31:
            return "Perfect possible"
        if best_iv >= 28:
            return "Elite"
        if best_iv >= 24:
            return "Strong"
        if best_iv >= 16:
            return "Decent"
        return "Low"

    @staticmethod
    def get_nature_modifiers(nature: dict) -> Dict[str, float]:
        modifiers = {stat_key: 1.0 for stat_key in STAT_KEYS}
        if nature["name"] in NEUTRAL_NATURES:
            return modifiers

        increased = nature.get("increased_stat")
        decreased = nature.get("decreased_stat")
        if increased is not None:
            modifiers[increased["name"]] = 1.1
        if decreased is not None:
            modifiers[decreased["name"]] = 0.9
        return modifiers

    def find_matching_ivs(self, stat_key: str, observed_stat: int, base_stat: int, ev: int, level: int, nature_modifier: float) -> List[int]:
        matches: List[int] = []
        for iv in range(32):
            if self.calculate_stat(stat_key, base_stat, iv, ev, level, nature_modifier) == observed_stat:
                matches.append(iv)
        return matches

    async def calculate(self, payload: CalculateRequest) -> CalculateResponse:
        pokemon = await self.pokeapi_service.get_pokemon(payload.pokemon_name)
        nature = await self.pokeapi_service.get_nature(payload.nature)
        summary = self.pokeapi_service.build_summary(pokemon)
        nature_modifiers = self.get_nature_modifiers(nature)

        observed_stats = payload.observed_stats.by_api_key()
        evs = payload.evs.by_api_key()

        results: Dict[str, StatResult] = {}
        perfect_stats: List[str] = []
        best_stat_name = None
        best_iv_value = -1
        impossible_count = 0

        for stat_key in STAT_KEYS:
            matches = self.find_matching_ivs(
                stat_key=stat_key,
                observed_stat=observed_stats[stat_key],
                base_stat=summary.base_stats[stat_key],
                ev=evs[stat_key],
                level=payload.level,
                nature_modifier=nature_modifiers[stat_key],
            )

            impossible = not matches
            if impossible:
                impossible_count += 1
                range_text = "N/A"
                quality = "No match"
                best_match = None
                perfect_possible = False
            else:
                range_text = str(matches[0]) if len(matches) == 1 else f"{matches[0]} - {matches[-1]}"
                best_match = matches[-1]
                quality = self.describe_iv_quality(best_match, len(matches))
                perfect_possible = 31 in matches
                if perfect_possible:
                    perfect_stats.append(STAT_LABELS[stat_key])
                if best_match > best_iv_value:
                    best_iv_value = best_match
                    best_stat_name = STAT_LABELS[stat_key]

            results[stat_key] = StatResult(
                stat_key=stat_key,
                label=STAT_LABELS[stat_key],
                color=STAT_COLORS[stat_key],
                base_stat=summary.base_stats[stat_key],
                observed_stat=observed_stats[stat_key],
                ev=evs[stat_key],
                matches=matches,
                range_text=range_text,
                quality=quality,
                best_match=best_match,
                perfect_possible=perfect_possible,
                impossible=impossible,
            )

        best_stat_summary = (
            f"Best Match: {best_stat_name} at up to {best_iv_value} IV"
            if best_stat_name is not None
            else "Best Match: None"
        )
        perfect_iv_summary = (
            f"31 IV Stats: {', '.join(perfect_stats)}"
            if perfect_stats
            else "31 IV Stats: None confirmed"
        )
        status = (
            f"Calculated with {impossible_count} impossible stat slot(s). Double-check inputs."
            if impossible_count
            else f"Calculation complete for {summary.display_name} at level {payload.level}."
        )

        return CalculateResponse(
            pokemon=summary,
            level=payload.level,
            nature=payload.nature.title(),
            best_stat_summary=best_stat_summary,
            perfect_iv_summary=perfect_iv_summary,
            impossible_count=impossible_count,
            status=status,
            results=results,
        )
