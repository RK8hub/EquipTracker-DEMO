import type { HTMLAttributes, ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen, Settings } from "lucide-react";
import { Tab } from "../Tab";
import { cn } from "../../lib/cn";
import "./sidebar.css";

export interface SidebarItem {
  id: string;
  label: string;
  icon?: ReactNode;
  active?: boolean;
}

export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  user?: { name: string; email: string };
  workspace?: { name: string; company: string };
  workspaceIcon?: ReactNode;
  items: SidebarItem[];
  onNavigate?: (id: string) => void;
  onUserClick?: () => void;
  onWorkspaceClick?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

export function Sidebar({
  user,
  workspace,
  workspaceIcon,
  items,
  onNavigate,
  onUserClick,
  onWorkspaceClick,
  collapsed = false,
  onToggleCollapse,
  className,
  ...props
}: SidebarProps) {
  const CollapseIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <aside
      className={cn("eq-sidebar", collapsed && "eq-sidebar--collapsed", className)}
      {...props}
    >
      {workspace && (
        <div className="eq-sidebar__header">
          <button
            type="button"
            className="eq-sidebar__workspace"
            onClick={onWorkspaceClick}
            disabled={!onWorkspaceClick}
            aria-disabled={!onWorkspaceClick}
            title={collapsed ? `${workspace.name}${workspace.company ? ` · ${workspace.company}` : ""}` : undefined}
          >
            <span className="eq-sidebar__workspace-icon">
              {workspaceIcon ?? initials(workspace.name)}
            </span>
            {!collapsed && (
              <span className="eq-sidebar__workspace-text">
                <span className="eq-sidebar__workspace-name">{workspace.name}</span>
                <span className="eq-sidebar__workspace-company">
                  {workspace.company}
                </span>
              </span>
            )}
          </button>
          {onToggleCollapse && (
            <button
              type="button"
              className="eq-sidebar__toggle"
              onClick={onToggleCollapse}
              aria-label={collapsed ? "Expandir panel" : "Contraer panel"}
              title={collapsed ? "Expandir panel" : "Contraer panel"}
            >
              <CollapseIcon aria-hidden="true" strokeWidth={1.5} className="size-4" />
            </button>
          )}
        </div>
      )}

      <div className="eq-sidebar__tabs">
        {!collapsed && <span className="eq-sidebar__section">Pestañas</span>}
        <nav className="eq-sidebar__nav">
          {items.map((item) => (
            <Tab
              key={item.id}
              label={item.label}
              icon={item.icon}
              active={item.active}
              collapsed={collapsed}
              showChevron={!collapsed}
              onClick={() => onNavigate?.(item.id)}
            />
          ))}
        </nav>
      </div>

      {user && (
        <button
          type="button"
          className="eq-sidebar__user"
          onClick={onUserClick}
          title={collapsed ? `${user.name} · ${user.email}` : undefined}
        >
          <span className="eq-sidebar__avatar">{initials(user.name)}</span>
          {!collapsed && (
            <>
              <span className="eq-sidebar__user-text">
                <span className="eq-sidebar__user-name">{user.name}</span>
                <span className="eq-sidebar__user-email">{user.email}</span>
              </span>
              <Settings aria-hidden="true" strokeWidth={1.5} className="eq-sidebar__chevrons" />
            </>
          )}
        </button>
      )}
    </aside>
  );
}
