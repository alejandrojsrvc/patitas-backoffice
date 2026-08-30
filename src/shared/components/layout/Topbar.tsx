import { LogOut, Menu } from "lucide-react";

export function Topbar({
  onMenu,
  onLogout,
}: {
  onMenu: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="topbar">
      <button className="menu-button" type="button" aria-label="Abrir navegación" onClick={onMenu}>
        <Menu size={21} />
      </button>
      <div className="environment">
        <span />
        API conectada
      </div>
      <div className="top-actions">
        <div className="avatar">AS</div>
        <div className="user-meta">
          <strong>Operaciones</strong>
          <span>Administrador</span>
        </div>
        <button
          className="icon-button"
          title="Cerrar sesión"
          onClick={onLogout}
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
