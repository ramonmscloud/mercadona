import re
from difflib import SequenceMatcher

from csv_handler import CsvHandler

SIMILARITY_THRESHOLD = 0.72


def _shared_token(a: str, b: str, min_len: int = 3) -> bool:
    tokens_a = set(re.findall(r"[a-z0-9]+", a.lower()))
    tokens_b = set(re.findall(r"[a-z0-9]+", b.lower()))
    for ta in tokens_a:
        if len(ta) < min_len:
            continue
        for tb in tokens_b:
            if len(tb) < min_len:
                continue
            if ta in tb or tb in ta:
                return True
    return False


class DuplicateFinder:
    def __init__(self, csv_handler: CsvHandler) -> None:
        self.csv = csv_handler

    def find_duplicates(self) -> list[dict]:
        rows = self.csv.read_all()
        n = len(rows)
        if n < 2:
            return []

        parent = list(range(n))

        def find(i: int) -> int:
            while parent[i] != i:
                parent[i] = parent[parent[i]]
                i = parent[i]
            return i

        def union(i: int, j: int) -> None:
            ri, rj = find(i), find(j)
            if ri != rj:
                parent[ri] = rj

        for i in range(n):
            a = rows[i]["Articulo"].lower()
            for j in range(i + 1, n):
                b = rows[j]["Articulo"].lower()
                if a == b:
                    union(i, j)
                    continue
                if len(a) < 3 or len(b) < 3:
                    continue
                if abs(len(a) - len(b)) > max(len(a), len(b)) * 0.4:
                    continue
                if not _shared_token(a, b):
                    continue
                ratio = SequenceMatcher(None, a, b).ratio()
                if ratio >= SIMILARITY_THRESHOLD:
                    union(i, j)

        groups_map: dict[int, list[int]] = {}
        for i in range(n):
            root = find(i)
            groups_map.setdefault(root, []).append(i)

        result = []
        for indices in groups_map.values():
            if len(indices) > 1:
                items = [
                    {
                        "index": idx,
                        "pasillo": rows[idx]["Pasillo"],
                        "articulo": rows[idx]["Articulo"],
                    }
                    for idx in sorted(indices)
                ]
                result.append({"items": items, "reason": "Similitud de texto >= 65%"})
        return result

    def merge_group(self, group: dict, keep_index: int) -> None:
        rows = self.csv.read_all()
        items = sorted(
            group.get("items", []), key=lambda x: x.get("index", 0), reverse=True
        )
        current_keep = keep_index
        for item in items:
            idx = item.get("index", -1)
            if idx != current_keep and 0 <= idx < len(rows):
                rows.pop(idx)
                if idx < current_keep:
                    current_keep -= 1
        self.csv.write_all(rows)
