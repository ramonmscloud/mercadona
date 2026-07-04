import tkinter as tk
from tkinter import ttk, messagebox, simpledialog

from csv_handler import CsvHandler
from duplicate_finder import DuplicateFinder


class MercadonaApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Gestor Lista Mercadona")
        self.root.geometry("1100x650")
        self.root.minsize(800, 500)

        self.csv = CsvHandler()
        self.finder = DuplicateFinder(self.csv)

        self._all_rows: list[dict[str, str]] = []
        self._filtered_rows: list[dict[str, str]] = []
        self._current_pasillo: str | None = None

        self._build_ui()
        self._load_data()

    def _build_ui(self) -> None:
        self.root.columnconfigure(1, weight=1)
        self.root.rowconfigure(1, weight=1)

        self._build_toolbar()
        self._build_main_area()
        self._build_statusbar()

    def _build_toolbar(self) -> None:
        toolbar = ttk.Frame(self.root, padding=4)
        toolbar.grid(row=0, column=0, columnspan=2, sticky="ew")

        ttk.Button(toolbar, text="+ Añadir", command=self._on_add).pack(side="left", padx=2)
        ttk.Button(toolbar, text="✎ Cambiar", command=self._on_edit).pack(side="left", padx=2)
        ttk.Button(toolbar, text="✕ Borrar", command=self._on_delete).pack(side="left", padx=2)
        ttk.Button(toolbar, text="▲", width=2, command=self._on_move_up).pack(side="left", padx=1)

        ttk.Button(toolbar, text="▼", width=2, command=self._on_move_down).pack(side="left", padx=(1, 4))
        ttk.Separator(toolbar, orient="vertical").pack(side="left", fill="y", padx=8, pady=2)

        ttk.Button(toolbar, text="🔍 Duplicados", command=self._on_find_duplicates).pack(
            side="left", padx=2
        )

        ttk.Separator(toolbar, orient="vertical").pack(side="left", fill="y", padx=8, pady=2)
        ttk.Button(toolbar, text="📋 Copiar", command=self._on_copy).pack(side="left", padx=2)

        ttk.Separator(toolbar, orient="vertical").pack(side="left", fill="y", padx=8, pady=2)
        ttk.Button(toolbar, text="Pasillos...", command=self._on_manage_pasillos).pack(side="left", padx=2)

        ttk.Separator(toolbar, orient="vertical").pack(side="left", fill="y", padx=8, pady=2)

        ttk.Label(toolbar, text="Buscar:").pack(side="left", padx=(2, 2))
        self._search_var = tk.StringVar()
        self._search_var.trace_add("write", lambda *_: self._apply_filter())
        search_entry = ttk.Entry(toolbar, textvariable=self._search_var, width=25)
        search_entry.pack(side="left", padx=2)
        search_entry.bind("<Return>", lambda e: self._apply_filter())

        ttk.Label(toolbar, text="", textvariable=tk.StringVar(value="")).pack(
            side="right", padx=4
        )

    def _build_main_area(self) -> None:
        pw = ttk.PanedWindow(self.root, orient="horizontal")
        pw.grid(row=1, column=0, columnspan=2, sticky="nsew", padx=4, pady=2)

        left_frame = ttk.LabelFrame(pw, text="Pasillos", padding=2)
        pw.add(left_frame, weight=0)
        left_frame.columnconfigure(0, weight=1)
        left_frame.rowconfigure(0, weight=1)

        self._pasillo_list = tk.Listbox(left_frame, width=32, exportselection=False)
        self._pasillo_list.grid(row=0, column=0, sticky="nsew")
        self._pasillo_list.bind("<<ListboxSelect>>", self._on_pasillo_select)

        pasillo_scroll = ttk.Scrollbar(left_frame, orient="vertical", command=self._pasillo_list.yview)
        pasillo_scroll.grid(row=0, column=1, sticky="ns")
        self._pasillo_list.configure(yscrollcommand=pasillo_scroll.set)

        right_frame = ttk.Frame(pw)
        pw.add(right_frame, weight=1)
        right_frame.columnconfigure(0, weight=1)
        right_frame.rowconfigure(0, weight=1)

        columns = ("#", "Articulo", "Pasillo")
        self._tree = ttk.Treeview(right_frame, columns=columns, show="headings", selectmode="browse")
        self._tree.heading("#", text="#")
        self._tree.heading("Articulo", text="Articulo")
        self._tree.heading("Pasillo", text="Pasillo")
        self._tree.column("#", width=50, anchor="center")
        self._tree.column("Articulo", width=380)
        self._tree.column("Pasillo", width=200)
        self._tree.grid(row=0, column=0, sticky="nsew")
        self._tree.bind("<Double-1>", lambda e: self._on_edit())
        self._tree.bind("<Delete>", lambda e: self._on_delete())
        self._tree.bind("<Control-Up>", lambda e: self._on_move_up())
        self._tree.bind("<Control-Down>", lambda e: self._on_move_down())
        self._tree.bind("<Control-c>", lambda e: self._on_copy())
        self.root.bind("<Control-Up>", lambda e: self._on_move_up())
        self.root.bind("<Control-Down>", lambda e: self._on_move_down())
        self.root.bind("<Control-c>", lambda e: self._on_copy())
        self._iid_to_row: dict[str, dict] = {}
        self._focused_iid: str | None = None
        self._tree.bind("<ButtonRelease-1>", self._on_click)
        self._tree.bind("<<TreeviewSelect>>", self._on_select)

        tree_scroll_y = ttk.Scrollbar(right_frame, orient="vertical", command=self._tree.yview)
        tree_scroll_y.grid(row=0, column=1, sticky="ns")
        tree_scroll_x = ttk.Scrollbar(right_frame, orient="horizontal", command=self._tree.xview)
        tree_scroll_x.grid(row=1, column=0, sticky="ew")
        self._tree.configure(
            yscrollcommand=tree_scroll_y.set, xscrollcommand=tree_scroll_x.set
        )

    def _build_statusbar(self) -> None:
        self._status_var = tk.StringVar(value="Listo")
        status = ttk.Label(self.root, textvariable=self._status_var, relief="sunken", anchor="w", padding=2)
        status.grid(row=2, column=0, columnspan=2, sticky="ew")

    def _load_data(self) -> None:
        self._all_rows = self.csv.read_all()
        self._load_pasillos()
        self._apply_filter()

    def _load_pasillos(self) -> None:
        self._pasillo_list.delete(0, tk.END)
        self._pasillo_list.insert(tk.END, "— Todos —")
        for pasillo, count in self.csv.get_pasillos_counts():
            self._pasillo_list.insert(tk.END, f"{pasillo}  ({count})")
        self._pasillo_list.selection_set(0)

    def _refresh_pasillos(self) -> None:
        sel = self._pasillo_list.curselection()
        selected_text = None
        if sel:
            selected_text = self._pasillo_list.get(sel[0])
        self._pasillo_list.delete(0, tk.END)
        self._pasillo_list.insert(tk.END, "— Todos —")
        new_idx = 0
        for i, (pasillo, count) in enumerate(self.csv.get_pasillos_counts()):
            text = f"{pasillo}  ({count})"
            self._pasillo_list.insert(tk.END, text)
            if selected_text and text == selected_text:
                new_idx = i + 1
        self._pasillo_list.selection_set(new_idx)

    def _on_pasillo_select(self, event: tk.Event | None = None) -> None:
        sel = self._pasillo_list.curselection()
        if not sel:
            self._current_pasillo = None
        elif sel[0] == 0:
            self._current_pasillo = None
        else:
            text = self._pasillo_list.get(sel[0])
            self._current_pasillo = text.rsplit("  (", 1)[0]
        self._apply_filter()

    def _apply_filter(self) -> None:
        search = self._search_var.get().lower()
        pasillo = self._current_pasillo

        self._filtered_rows = []
        for i, r in enumerate(self._all_rows):
            if pasillo and r["Pasillo"] != pasillo:
                continue
            if search and search not in r["Articulo"].lower() and search not in r["Pasillo"].lower():
                continue
            self._filtered_rows.append(r)

        self._refresh_tree()

    def _refresh_tree(self) -> None:
        self._tree.delete(*self._tree.get_children())
        self._iid_to_row.clear()
        for i, r in enumerate(self._filtered_rows):
            iid = str(i)
            self._tree.insert("", "end", iid=iid, values=(str(i), r["Articulo"], r["Pasillo"]))
            self._iid_to_row[iid] = r
        self._status_var.set(
            f"{len(self._filtered_rows)} articulos mostrados de {len(self._all_rows)} totales"
        )

    def _on_click(self, event: tk.Event) -> None:
        iid = self._tree.identify_row(event.y)
        if not iid:
            sel = self._tree.selection()
            if sel:
                iid = sel[0]
        if iid and iid in self._iid_to_row:
            self._focused_iid = iid

    def _on_select(self, event: tk.Event) -> None:
        sel = self._tree.selection()
        if sel and sel[0] in self._iid_to_row:
            self._focused_iid = sel[0]

    def _cur_row(self) -> dict | None:
        if self._focused_iid and self._focused_iid in self._iid_to_row:
            return self._iid_to_row[self._focused_iid]
        iid = self._tree.focus() or (self._tree.selection() or [None])[0]
        if iid and iid in self._iid_to_row:
            return self._iid_to_row[iid]
        return None

    def _get_selected_row(self) -> dict | None:
        return self._cur_row()

    def _get_selected_global_index(self) -> int | None:
        row = self._cur_row()
        if row is None:
            return None
        for i, r in enumerate(self._all_rows):
            if r is row:
                return i
        return None

    def _on_add(self) -> None:
        dialog = ArticleDialog(self.root, "Añadir articulo", pasillos=self.csv.get_pasillos())
        if dialog.result:
            self._all_rows.append({"Pasillo": dialog.result["Pasillo"], "Articulo": dialog.result["Articulo"]})
            self.csv.write_all(self._all_rows)
            self._refresh_pasillos()
            self._apply_filter()
            self._status_var.set(f"Anadido: {dialog.result['Articulo']}")

    def _on_edit(self) -> None:
        row = self._get_selected_row()
        if not row:
            messagebox.showinfo("Info", "Selecciona un articulo primero.")
            return
        dialog = ArticleDialog(
            self.root,
            "Cambiar articulo",
            pasillos=self.csv.get_pasillos(),
            pasillo=row["Pasillo"],
            articulo=row["Articulo"],
        )
        if dialog.result:
            global_idx = self._get_selected_global_index()
            if global_idx is not None:
                self._all_rows[global_idx] = {
                    "Pasillo": dialog.result["Pasillo"],
                    "Articulo": dialog.result["Articulo"],
                }
                self.csv.write_all(self._all_rows)
                self._refresh_pasillos()
                self._apply_filter()
                self._status_var.set(f"Actualizado: {dialog.result['Articulo']}")

    def _on_delete(self) -> None:
        global_idx = self._get_selected_global_index()
        if global_idx is None:
            messagebox.showinfo("Info", "Selecciona un articulo primero.")
            return
        row = self._all_rows[global_idx]
        if messagebox.askyesno("Confirmar", f"Borrar [{row['Pasillo']}] {row['Articulo']}?"):
            self._all_rows.pop(global_idx)
            self.csv.write_all(self._all_rows)
            self._refresh_pasillos()
            self._apply_filter()
            self._status_var.set(f"Borrado: {row['Articulo']}")

    def _on_copy(self) -> None:
        row = self._cur_row()
        if not row:
            return
        text = f"{row['Pasillo']}; {row['Articulo']}"
        self.root.clipboard_clear()
        self.root.clipboard_append(text)
        self._status_var.set(f"Copiado: {text}")

    def _on_move_up(self) -> None:
        row, idx = self._cur_row(), None
        if row is not None:
            for i, r in enumerate(self._all_rows):
                if r is row:
                    idx = i
                    break
        if idx is None or idx == 0:
            return
        pasillo = row["Pasillo"]
        prev = next((i for i in range(idx - 1, -1, -1) if self._all_rows[i]["Pasillo"] == pasillo), None)
        if prev is None:
            return
        self._all_rows[idx], self._all_rows[prev] = self._all_rows[prev], self._all_rows[idx]
        self._save_and_refresh(row)

    def _on_move_down(self) -> None:
        row, idx = self._cur_row(), None
        if row is not None:
            for i, r in enumerate(self._all_rows):
                if r is row:
                    idx = i
                    break
        if idx is None or idx >= len(self._all_rows) - 1:
            return
        pasillo = row["Pasillo"]
        nxt = next((i for i in range(idx + 1, len(self._all_rows)) if self._all_rows[i]["Pasillo"] == pasillo), None)
        if nxt is None:
            return
        self._all_rows[idx], self._all_rows[nxt] = self._all_rows[nxt], self._all_rows[idx]
        self._save_and_refresh(row)

    def _save_and_refresh(self, row: dict) -> None:
        self.csv.write_all(self._all_rows)
        self._apply_filter()
        for i, r in enumerate(self._filtered_rows):
            if r is row:
                self._tree.selection_set(str(i))
                self._tree.see(str(i))
                break
        self._status_var.set(f"Movido: {row['Articulo']}")

    def _on_find_duplicates(self) -> None:
        if not self.finder:
            return
        result = self.finder.find_duplicates()
        self._show_duplicates(result)

    def _show_duplicates(self, groups: list[dict]) -> None:
        if not groups:
            messagebox.showinfo("Duplicados", "No se encontraron duplicados.")
            return

        dialog = DuplicatesDialog(self.root, groups)
        if dialog.selected_group is not None and dialog.keep_index is not None:
            self.finder.merge_group(dialog.selected_group, dialog.keep_index)
            self._all_rows = self.csv.read_all()
            self._refresh_pasillos()
            self._apply_filter()
            self._status_var.set("Duplicados fusionados.")

    def _on_manage_pasillos(self) -> None:
        menu = tk.Menu(self.root, tearoff=0)
        menu.add_command(label="Renombrar pasillo", command=self._rename_pasillo)
        menu.add_command(label="Mover articulos entre pasillos", command=self._move_articles)
        menu.add_command(label="Fusionar dos pasillos", command=self._merge_pasillos)
        try:
            menu.tk_popup(self.root.winfo_pointerx(), self.root.winfo_pointery())
        finally:
            menu.grab_release()

    def _rename_pasillo(self) -> None:
        pasillos = self.csv.get_pasillos()
        dialog = SimpleListChoice(self.root, "Renombrar pasillo", "Selecciona pasillo:", pasillos)
        if dialog.selected is None:
            return
        old = dialog.selected
        nuevo = simpledialog.askstring("Renombrar", f"Nuevo nombre para '{old}':", parent=self.root)
        if nuevo:
            count = 0
            for r in self._all_rows:
                if r["Pasillo"] == old:
                    r["Pasillo"] = nuevo
                    count += 1
            self.csv.write_all(self._all_rows)
            self._refresh_pasillos()
            self._apply_filter()
            self._status_var.set(f"Renombrado '{old}' -> '{nuevo}' ({count} articulos)")

    def _move_articles(self) -> None:
        pasillos = self.csv.get_pasillos()
        dialog = SimpleListChoice(self.root, "Mover articulos", "Pasillo origen:", pasillos)
        if dialog.selected is None:
            return
        origen = dialog.selected

        rows_origen = [(i, r) for i, r in enumerate(self._all_rows) if r["Pasillo"] == origen]
        if not rows_origen:
            messagebox.showinfo("Info", f"No hay articulos en '{origen}'")
            return

        dialog2 = SimpleListChoice(
            self.root,
            "Mover articulos",
            f"Pasillo destino para {len(rows_origen)} articulos:",
            pasillos + ["(nuevo pasillo)"],
        )
        if dialog2.selected is None:
            return
        if dialog2.selected == "(nuevo pasillo)":
            destino = simpledialog.askstring("Nuevo pasillo", "Nombre:", parent=self.root)
            if not destino:
                return
        else:
            destino = dialog2.selected

        count = 0
        for _, r in rows_origen:
            r["Pasillo"] = destino
            count += 1

        self.csv.write_all(self._all_rows)
        self._refresh_pasillos()
        self._apply_filter()
        self._status_var.set(f"Movidos {count} articulos de '{origen}' a '{destino}'")

    def _merge_pasillos(self) -> None:
        pasillos = self.csv.get_pasillos()
        if len(pasillos) < 2:
            messagebox.showinfo("Info", "Necesitas al menos 2 pasillos.")
            return

        dialog = SimpleListChoice(self.root, "Fusionar pasillos", "Pasillo A (absorbe al otro):", pasillos)
        if dialog.selected is None:
            return
        pasillo_a = dialog.selected

        remaining = [p for p in pasillos if p != pasillo_a]
        dialog2 = SimpleListChoice(
            self.root, "Fusionar pasillos", f"Pasillo B (se eliminara, sus articulos van a '{pasillo_a}'):", remaining
        )
        if dialog2.selected is None:
            return
        pasillo_b = dialog2.selected

        if messagebox.askyesno(
            "Confirmar",
            f"Fusionar '{pasillo_b}' en '{pasillo_a}'?\n"
            f"Todos los articulos de '{pasillo_b}' se moveran a '{pasillo_a}' y el pasillo B desaparecera.",
        ):
            count = 0
            for r in self._all_rows:
                if r["Pasillo"] == pasillo_b:
                    r["Pasillo"] = pasillo_a
                    count += 1
            self.csv.write_all(self._all_rows)
            self._refresh_pasillos()
            self._apply_filter()
            self._status_var.set(f"Fusionados {count} articulos de '{pasillo_b}' en '{pasillo_a}'")


class ArticleDialog(tk.Toplevel):
    def __init__(
        self,
        parent: tk.Tk,
        title: str,
        pasillos: list[str],
        pasillo: str = "",
        articulo: str = "",
    ) -> None:
        super().__init__(parent)
        self.title(title)
        self.geometry("480x220")
        self.transient(parent)
        self.grab_set()
        self.result: dict[str, str] | None = None

        frame = ttk.Frame(self, padding=15)
        frame.pack(fill="both", expand=True)

        ttk.Label(frame, text="Articulo:").grid(row=0, column=0, sticky="w", pady=(0, 2))
        self._articulo_var = tk.StringVar(value=articulo)
        ttk.Entry(frame, textvariable=self._articulo_var, width=50).grid(
            row=1, column=0, sticky="ew", pady=(0, 10)
        )

        ttk.Label(frame, text="Pasillo:").grid(row=2, column=0, sticky="w", pady=(0, 2))
        self._pasillo_var = tk.StringVar()
        self._pasillo_combo = ttk.Combobox(
            frame, textvariable=self._pasillo_var, values=pasillos, width=47, state="readonly"
        )
        self._pasillo_combo.grid(row=3, column=0, sticky="ew", pady=(0, 5))
        if pasillo in pasillos:
            self._pasillo_var.set(pasillo)
        elif pasillos:
            self._pasillo_var.set(pasillos[0])

        self._nuevo_pasillo_var = tk.StringVar()
        self._nuevo_check_var = tk.BooleanVar()
        ttk.Checkbutton(
            frame,
            text="Crear nuevo pasillo:",
            variable=self._nuevo_check_var,
            command=self._toggle_nuevo,
        ).grid(row=4, column=0, sticky="w")
        self._nuevo_entry = ttk.Entry(frame, textvariable=self._nuevo_pasillo_var, width=50, state="disabled")
        self._nuevo_entry.grid(row=5, column=0, sticky="ew", pady=(0, 10))

        btn_frame = ttk.Frame(frame)
        btn_frame.grid(row=6, column=0, sticky="e")
        ttk.Button(btn_frame, text="Cancelar", command=self.destroy).pack(side="right", padx=4)
        ttk.Button(btn_frame, text="Guardar", command=self._save).pack(side="right")

        frame.columnconfigure(0, weight=1)
        self.wait_window()

    def _toggle_nuevo(self) -> None:
        if self._nuevo_check_var.get():
            self._nuevo_entry.configure(state="normal")
            self._pasillo_combo.configure(state="disabled")
        else:
            self._nuevo_entry.configure(state="disabled")
            self._pasillo_combo.configure(state="readonly")

    def _save(self) -> None:
        articulo = self._articulo_var.get().strip()
        if not articulo:
            messagebox.showwarning("Error", "El articulo no puede estar vacio.", parent=self)
            return

        if self._nuevo_check_var.get():
            pasillo = self._nuevo_pasillo_var.get().strip()
            if not pasillo:
                messagebox.showwarning("Error", "Escribe el nombre del nuevo pasillo.", parent=self)
                return
        else:
            pasillo = self._pasillo_var.get().strip()

        self.result = {"Pasillo": pasillo, "Articulo": articulo}
        self.destroy()


class SimpleListChoice(tk.Toplevel):
    def __init__(self, parent: tk.Tk, title: str, label: str, options: list[str]) -> None:
        super().__init__(parent)
        self.title(title)
        self.geometry("420x350")
        self.transient(parent)
        self.grab_set()
        self.selected: str | None = None

        frame = ttk.Frame(self, padding=10)
        frame.pack(fill="both", expand=True)
        frame.columnconfigure(0, weight=1)
        frame.rowconfigure(1, weight=1)

        ttk.Label(frame, text=label).grid(row=0, column=0, sticky="w", pady=(0, 5))
        lb = tk.Listbox(frame, exportselection=False)
        lb.grid(row=1, column=0, sticky="nsew")
        for o in options:
            lb.insert(tk.END, o)
        scroll = ttk.Scrollbar(frame, orient="vertical", command=lb.yview)
        scroll.grid(row=1, column=1, sticky="ns")
        lb.configure(yscrollcommand=scroll.set)

        def _ok() -> None:
            sel = lb.curselection()
            if sel:
                self.selected = options[sel[0]]
                self.destroy()

        lb.bind("<Double-1>", lambda e: _ok())
        btn_frame = ttk.Frame(frame)
        btn_frame.grid(row=2, column=0, columnspan=2, sticky="e", pady=(10, 0))
        ttk.Button(btn_frame, text="Cancelar", command=self.destroy).pack(side="right", padx=4)
        ttk.Button(btn_frame, text="Seleccionar", command=_ok).pack(side="right")

        self.wait_window()


class DuplicatesDialog(tk.Toplevel):
    def __init__(self, parent: tk.Tk, groups: list[dict]) -> None:
        super().__init__(parent)
        self.title(f"Duplicados encontrados: {len(groups)} grupos")
        self.geometry("700x500")
        self.transient(parent)
        self.grab_set()
        self.selected_group: dict | None = None
        self.keep_index: int | None = None
        self._groups = groups

        frame = ttk.Frame(self, padding=10)
        frame.pack(fill="both", expand=True)
        frame.columnconfigure(0, weight=1)
        frame.rowconfigure(0, weight=1)

        columns = ("grupo", "articulo", "pasillo")
        tree = ttk.Treeview(frame, columns=columns, show="headings", selectmode="browse")
        tree.heading("grupo", text="Grupo")
        tree.heading("articulo", text="Articulo")
        tree.heading("pasillo", text="Pasillo")
        tree.column("grupo", width=60, anchor="center")
        tree.column("articulo", width=350)
        tree.column("pasillo", width=200)
        tree.grid(row=0, column=0, sticky="nsew")

        scroll_y = ttk.Scrollbar(frame, orient="vertical", command=tree.yview)
        scroll_y.grid(row=0, column=1, sticky="ns")
        tree.configure(yscrollcommand=scroll_y.set)

        self._tree = tree
        self._item_to_group: dict[str, tuple[int, dict]] = {}
        for g_idx, group in enumerate(groups):
            for item in group.get("items", []):
                iid = tree.insert(
                    "", "end",
                    values=(
                        f"G{g_idx+1}",
                        item.get("articulo", "?"),
                        item.get("pasillo", "?"),
                    ),
                )
                self._item_to_group[iid] = (g_idx, item)

        ttk.Label(
            frame,
            text="Selecciona un articulo y haz clic en 'Fusionar' para conservar ese articulo y eliminar los demas del grupo.",
            wraplength=650,
        ).grid(row=1, column=0, sticky="w", pady=(10, 5))

        btn_frame = ttk.Frame(frame)
        btn_frame.grid(row=2, column=0, sticky="e")
        ttk.Button(btn_frame, text="Cerrar", command=self.destroy).pack(side="right", padx=4)
        ttk.Button(btn_frame, text="Fusionar grupo (conservar seleccionado)", command=self._merge).pack(
            side="right", padx=4
        )

        self.wait_window()

    def _merge(self) -> None:
        sel = self._tree.selection()
        if not sel:
            messagebox.showwarning("Error", "Selecciona un articulo para conservar.", parent=self)
            return
        info = self._item_to_group.get(sel[0])
        if info is None:
            return
        g_idx, item = info
        self.selected_group = self._groups[g_idx]
        self.keep_index = item.get("index", -1)
        self.destroy()


def main() -> None:
    root = tk.Tk()
    MercadonaApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
