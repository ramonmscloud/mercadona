import csv
import os
import re
from typing import Any

CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "compra mercadona.csv")


def _pasillo_sort_key(name: str) -> tuple[int, str]:
    nums = re.findall(r"\d+", name)
    if nums:
        return (int(nums[0]), name)
    return (10**9, name)


class CsvHandler:
    def __init__(self, csv_path: str | None = None) -> None:
        self.csv_path = csv_path or CSV_PATH

    def read_all(self) -> list[dict[str, str]]:
        rows: list[dict[str, str]] = []
        with open(self.csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f, delimiter=";")
            for r in reader:
                pasillo = r.get("Pasillo", "").strip()
                articulo = r.get("Art\u00edculo", r.get("Articulo", "")).strip()
                if pasillo or articulo:
                    rows.append({"Pasillo": pasillo, "Articulo": articulo})
        return rows

    def write_all(self, rows: list[dict[str, str]]) -> None:
        with open(self.csv_path, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["Pasillo", "Art\u00edculo"], delimiter=";")
            writer.writeheader()
            for r in rows:
                writer.writerow({"Pasillo": r["Pasillo"], "Art\u00edculo": r["Articulo"]})

    def get_pasillos(self) -> list[str]:
        rows = self.read_all()
        seen: set[str] = set()
        result: list[str] = []
        for r in rows:
            if r["Pasillo"] not in seen:
                seen.add(r["Pasillo"])
                result.append(r["Pasillo"])
        result.sort(key=_pasillo_sort_key)
        return result

    def get_pasillos_counts(self) -> list[tuple[str, int]]:
        rows = self.read_all()
        counts: dict[str, int] = {}
        for r in rows:
            counts[r["Pasillo"]] = counts.get(r["Pasillo"], 0) + 1
        return sorted(counts.items(), key=lambda x: _pasillo_sort_key(x[0]))
