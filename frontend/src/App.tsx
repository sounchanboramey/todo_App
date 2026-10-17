import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";

type Status = "To Do" | "In Progress" | "Done";
type Todo = { id: number; title: string; status: Status; priority: boolean };
type ApiStatus = "TODO" | "IN_PROGRESS" | "DONE";
type ApiTodo = Omit<Todo, "status"> & { status: ApiStatus };
const statuses: Status[] = ["To Do", "In Progress", "Done"];
const API_URL = "http://localhost:3001/api/todos";
const toApiStatus: Record<Status, ApiStatus> = {
  "To Do": "TODO",
  "In Progress": "IN_PROGRESS",
  Done: "DONE",
};
const fromApiStatus: Record<ApiStatus, Status> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

function fromApiTodo(todo: ApiTodo): Todo {
  return { ...todo, status: fromApiStatus[todo.status] };
}

async function apiRequest<T>(path = "", options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  if (!response.ok) {
    throw new Error(`Backend request failed (${response.status})`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const statusClass = (status: Status) =>
  status.toLowerCase().replaceAll(" ", "-");

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    name: "Bormey",
    role: "Frontend learner",
  });
  const [page, setPage] = useState<"tasks" | "profile">("tasks");
  const [filter, setFilter] = useState<Status | "All">("All");
  const [search, setSearch] = useState("");
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [editing, setEditing] = useState<Todo | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<Status>("To Do");
  const [priority, setPriority] = useState(false);
  const [notice, setNotice] = useState("");
  const dragging = useRef<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTodos() {
      try {
        const tasks = await apiRequest<ApiTodo[]>("", {
          signal: controller.signal,
        });
        setTodos(tasks.map(fromApiTodo));
        setNotice("");
      } catch {
        if (!controller.signal.aborted) {
          setNotice("Could not connect to NestJS. Start the backend and refresh.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadTodos();
    return () => controller.abort();
  }, []);

  const visible = todos.filter(
    (todo) =>
      (filter === "All" || todo.status === filter) &&
      (!priorityOnly || todo.priority) &&
      todo.title.toLowerCase().includes(search.toLowerCase()),
  );
  const done = todos.filter((todo) => todo.status === "Done").length;
  const progress = todos.length ? Math.round((done / todos.length) * 100) : 0;
  const initials = profile.name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function update(id: number, patch: Partial<Todo>): Promise<boolean> {
    try {
      const apiPatch = {
        ...patch,
        ...(patch.status ? { status: toApiStatus[patch.status] } : {}),
      };
      const savedTodo = await apiRequest<ApiTodo>(`/${id}`, {
        method: "PATCH",
        body: JSON.stringify(apiPatch),
      });
      setTodos((current) =>
        current.map((todo) =>
          todo.id === id ? fromApiTodo(savedTodo) : todo,
        ),
      );
      setNotice("Task updated.");
      return true;
    } catch {
      setNotice("Could not update the task. Check that NestJS is running.");
      return false;
    }
  }
  async function remove(ids: number[]) {
    try {
      await Promise.all(
        ids.map((id) => apiRequest<void>(`/${id}`, { method: "DELETE" })),
      );
      setTodos((current) => current.filter((todo) => !ids.includes(todo.id)));
      setSelected((current) => current.filter((id) => !ids.includes(id)));
      setNotice(`${ids.length} ${ids.length === 1 ? "task" : "tasks"} deleted.`);
    } catch {
      setNotice("Could not delete the task. Check that NestJS is running.");
    }
  }
  function openEditor(todo?: Todo) {
    setEditing(todo ?? null);
    setTitle(todo?.title ?? "");
    setStatus(todo?.status ?? "To Do");
    setPriority(todo?.priority ?? false);
    setCreating(true);
  }
  async function saveTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    try {
      if (editing) {
        const saved = await update(editing.id, {
          title: title.trim(),
          status,
          priority,
        });
        if (!saved) return;
      } else {
        const created = await apiRequest<ApiTodo>("", {
          method: "POST",
          body: JSON.stringify({
            title: title.trim(),
            status: toApiStatus[status],
            priority,
          }),
        });
        setTodos((current) => [...current, fromApiTodo(created)]);
        setNotice("Task added.");
      }
      setCreating(false);
    } catch {
      setNotice("Could not save the task. Check that NestJS is running.");
    }
  }
  async function updateSelectedStatus(nextStatus: Status) {
    try {
      const updates = await Promise.all(
        selected.map((id) =>
          apiRequest<ApiTodo>(`/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ status: toApiStatus[nextStatus] }),
          }),
        ),
      );
      setTodos((current) =>
        current.map((todo) => {
          const updated = updates.find((item) => item.id === todo.id);
          return updated ? fromApiTodo(updated) : todo;
        }),
      );
      setSelected([]);
      setNotice("Selected tasks updated.");
    } catch {
      setNotice("Could not update selected tasks. Check that NestJS is running.");
    }
  }
  function move(id: number, targetId: number) {
    setTodos((current) => {
      const next = [...current];
      const from = next.findIndex((todo) => todo.id === id);
      const to = next.findIndex((todo) => todo.id === targetId);
      if (from < 0 || to < 0 || from === to) return current;
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
  }
  function navigate(starred: boolean) {
    setPage("tasks");
    setPriorityOnly(starred);
    setFilter("All");
    setSelected([]);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={() => navigate(false)}>
          <span className="brand-icon">✓</span> daylist
          <span className="brand-dot">.</span>
        </a>
        <div className="workspace">
          <span className="workspace-icon">B</span>
          <div>
            Personal workspace<small>A little focus, every day</small>
          </div>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          <button
            className={
              page === "tasks" && !priorityOnly ? "nav-item active" : "nav-item"
            }
            onClick={() => navigate(false)}
          >
            <span>▤</span> All tasks <b>{todos.length}</b>
          </button>
          <button
            className={
              page === "tasks" && priorityOnly ? "nav-item active" : "nav-item"
            }
            onClick={() => navigate(true)}
          >
            <span>☆</span> Starred{" "}
            <b>{todos.filter((todo) => todo.priority).length}</b>
          </button>
          <button
            className={page === "profile" ? "nav-item active" : "nav-item"}
            onClick={() => setPage("profile")}
          >
            <span>♙</span> My profile
          </button>
        </nav>
        <div className="sidebar-note">
          <span>✦</span>
          <strong>Small steps. Big things.</strong>
          <p>Make a little room for what matters. One task at a time.</p>
        </div>
        <button className="user-card" onClick={() => setPage("profile")}>
          <span className="avatar">{initials}</span>
          <span>
            <strong>{profile.name}</strong>
            <small>{profile.role}</small>
          </span>
          <span className="profile-arrow">↗</span>
        </button>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>
            My workspace <span className="breadcrumb">/</span>{" "}
            <strong>
              {page === "profile"
                ? "My profile"
                : priorityOnly
                  ? "Starred"
                  : "All tasks"}
            </strong>
          </span>
          <span className="session-tag">
            <i /> Personal space
          </span>
        </header>
        <main>
          {page === "profile" ? (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">MAKE YOURSELF AT HOME</div>
                  <h1>
                    My profile<span>.</span>
                  </h1>
                  <p>A familiar face behind every little accomplishment.</p>
                </div>
              </div>
              <section className="profile-panel">
                <span className="avatar large">{initials}</span>
                <h2>Your personal account</h2>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const data = new FormData(event.currentTarget);
                    const name = String(data.get("name")).trim();
                    if (!name) return;
                    setProfile({
                      name,
                      role:
                        String(data.get("role")).trim() || "Frontend learner",
                    });
                    setNotice("Profile updated.");
                  }}
                >
                  <label>
                    Display name
                    <input
                      name="name"
                      defaultValue={profile.name}
                      required
                      maxLength={50}
                      pattern=".*\S.*"
                    />
                  </label>
                  <label>
                    A little about you
                    <input
                      name="role"
                      defaultValue={profile.role}
                      maxLength={80}
                    />
                  </label>
                  <button className="primary" type="submit">
                    Save profile
                  </button>
                </form>
              </section>
            </>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">A FRESH LITTLE START</div>
                  <h1>
                    Let’s make things happen<span>.</span>
                  </h1>
                  <p>Hey {profile.name}, a little progress goes a long way.</p>
                </div>
                <button className="primary" onClick={() => openEditor()}>
                  <span>＋</span> New task
                </button>
              </div>
              <section className="stats" aria-label="Task overview">
                <div className="stat">
                  <span className="stat-icon lavender">▤</span>
                  <div>
                    <span>Total tasks</span>
                    <strong>
                      {todos.length}
                      <small>on your list</small>
                    </strong>
                  </div>
                </div>
                <div className="stat">
                  <span className="stat-icon peach">◷</span>
                  <div>
                    <span>In progress</span>
                    <strong>
                      {
                        todos.filter((todo) => todo.status === "In Progress")
                          .length
                      }
                      <small>making moves</small>
                    </strong>
                  </div>
                </div>
                <div className="stat">
                  <span className="stat-icon mint">✓</span>
                  <div>
                    <span>Completed</span>
                    <strong>
                      {done}
                      <small>little wins</small>
                    </strong>
                  </div>
                </div>
              </section>
              {loading && (
                <p className="api-loading" role="status">
                  Loading tasks from NestJS…
                </p>
              )}
              <section className="tasks-panel">
                <div className="panel-heading">
                  <div>
                    <h2>
                      {priorityOnly ? "Starred tasks" : "Your tasks"}{" "}
                      <span>{visible.length}</span>
                    </h2>
                    <p>A clear list. A clearer mind.</p>
                  </div>
                  <div className="search">
                    <span aria-hidden="true">⌕</span>
                    <input
                      aria-label="Search tasks"
                      placeholder="Search your tasks…"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                </div>
                <div className="filter-row">
                  <div className="filters" aria-label="Filter by status">
                    {(["All", ...statuses] as const).map((item) => (
                      <button
                        key={item}
                        aria-pressed={filter === item}
                        className={filter === item ? "filter active" : "filter"}
                        onClick={() => {
                          setFilter(item);
                          setSelected([]);
                        }}
                      >
                        {item === "All" ? "All tasks" : item}
                        <span>
                          {item === "All"
                            ? todos.length
                            : todos.filter((todo) => todo.status === item)
                                .length}
                        </span>
                      </button>
                    ))}
                  </div>
                  <span className="reorder-hint">⠿ Drag to reorder</span>
                </div>
                {selected.length > 0 && (
                  <div className="bulk-bar">
                    <strong>{selected.length} selected</strong>
                    <select
                      aria-label="Change selected tasks status"
                      value=""
                      onChange={(event) => {
                        const nextStatus = event.target.value as Status;
                        void updateSelectedStatus(nextStatus);
                      }}
                    >
                      <option value="" disabled>
                        Change status
                      </option>
                      {statuses.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                    <button className="danger" onClick={() => remove(selected)}>
                      Delete selected
                    </button>
                    <button onClick={() => setSelected([])}>Clear</button>
                  </div>
                )}
                <div className="table-head">
                  <label>
                    <input
                      type="checkbox"
                      aria-label="Select all visible tasks"
                      checked={
                        visible.length > 0 &&
                        visible.every((todo) => selected.includes(todo.id))
                      }
                      onChange={(event) =>
                        setSelected(
                          event.target.checked
                            ? [
                                ...new Set([
                                  ...selected,
                                  ...visible.map((todo) => todo.id),
                                ]),
                              ]
                            : selected.filter(
                                (id) => !visible.some((todo) => todo.id === id),
                              ),
                        )
                      }
                    />{" "}
                    TASK NAME
                  </label>
                  <span>STATUS</span>
                  <span>ACTIONS</span>
                </div>
                <div className="task-list">
                  {visible.map((todo, index) => (
                    <article
                      className={`task-row ${selected.includes(todo.id) ? "selected" : ""}`}
                      key={todo.id}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (dragging.current) move(dragging.current, todo.id);
                        dragging.current = null;
                      }}
                    >
                      <div className="task-title">
                        <span
                          className="drag-handle"
                          draggable
                          onDragStart={(event) => {
                            dragging.current = todo.id;
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/plain", String(todo.id));
                          }}
                          onDragEnd={() => {
                            dragging.current = null;
                          }}
                          title="Drag to reorder"
                        >
                          ⠿
                        </span>
                        <input
                          type="checkbox"
                          aria-label={`Select ${todo.title}`}
                          checked={selected.includes(todo.id)}
                          onChange={(event) =>
                            setSelected((current) =>
                              event.target.checked
                                ? [...current, todo.id]
                                : current.filter((id) => id !== todo.id),
                            )
                          }
                        />
                        <button
                          className={`title-button ${todo.status === "Done" ? "completed" : ""}`}
                          onClick={() => openEditor(todo)}
                        >
                          {todo.title}
                        </button>
                      </div>
                      <select
                        className={`status ${statusClass(todo.status)}`}
                        aria-label={`Status for ${todo.title}`}
                        value={todo.status}
                        onChange={(event) =>
                          update(todo.id, {
                            status: event.target.value as Status,
                          })
                        }
                      >
                        {statuses.map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                      <div className="row-actions">
                        <button
                          className={`icon-button star ${todo.priority ? "starred" : ""}`}
                          aria-label={`${todo.priority ? "Unstar" : "Star"} ${todo.title}`}
                          aria-pressed={todo.priority}
                          onClick={() =>
                            update(todo.id, { priority: !todo.priority })
                          }
                        >
                          {todo.priority ? "★" : "☆"}
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Edit ${todo.title}`}
                          onClick={() => openEditor(todo)}
                        >
                          ✎
                        </button>
                        <button
                          className="icon-button delete"
                          aria-label={`Delete ${todo.title}`}
                          onClick={() => remove([todo.id])}
                        >
                          ×
                        </button>
                        <div className="move-buttons">
                          <button
                            aria-label={`Move ${todo.title} up`}
                            disabled={index === 0}
                            onClick={() => move(todo.id, visible[index - 1].id)}
                          >
                            ↑
                          </button>
                          <button
                            aria-label={`Move ${todo.title} down`}
                            disabled={index === visible.length - 1}
                            onClick={() => move(todo.id, visible[index + 1].id)}
                          >
                            ↓
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                {visible.length === 0 && !loading && (
                  <div className="empty">
                    <span>☀</span>
                    <h3>
                      {todos.length
                        ? "A little breathing room"
                        : "Your next chapter starts here"}
                    </h3>
                    <p>
                      {todos.length
                        ? "No tasks match these filters. Try another status or search."
                        : "Add your first task and take it one step at a time."}
                    </p>
                    <button
                      onClick={() => {
                        setSearch("");
                        setFilter("All");
                        setPriorityOnly(false);
                        if (!todos.length) openEditor();
                      }}
                    >
                      {todos.length ? "Show all tasks" : "Create a task"} →
                    </button>
                  </div>
                )}
                <div className="table-footer">
                  <span>
                    {visible.length} of {todos.length} tasks
                  </span>
                  <span>
                    <span className="tiny-star">✧</span> Every little step
                    counts.
                  </span>
                </div>
              </section>
              <section className="progress-card">
                <div className="progress-art">✦</div>
                <div className="progress-copy">
                  <h3>You’re moving forward.</h3>
                  <p>
                    {done
                      ? `${done} ${done === 1 ? "task" : "tasks"} down. Take a moment to celebrate your progress.`
                      : "Your first little win is just one task away."}
                  </p>
                </div>
                <div className="progress-meter">
                  <div>
                    <span>Your progress</span>
                    <strong>{progress}%</strong>
                  </div>
                  <progress max="100" value={progress}>
                    {progress}%
                  </progress>
                </div>
              </section>
            </>
          )}
          <div className="bottom-note">
            Made for a little more focus <span>✦</span> One day at a time
          </div>
          <p className="state-note">
            Tasks are saved in PostgreSQL · Profile and ordering stay in React.
          </p>
          <div className="notice" role="status">
            {notice}
          </div>
        </main>
      </div>
      {creating && (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setCreating(false);
          }}
        >
          <dialog
            ref={(node) => {
              if (node && !node.open) node.showModal();
            }}
            onCancel={() => setCreating(false)}
            aria-labelledby="editor-title"
            onKeyDown={(event) => {
              if (event.key === "Escape") setCreating(false);
            }}
          >
            <div className="dialog-heading">
              <h2 id="editor-title">
                {editing ? "Edit task" : "A new little step"}
              </h2>
              <button
                aria-label="Close editor"
                className="icon-button"
                onClick={() => setCreating(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={saveTodo}>
              <label>
                Task title
                <input
                  autoFocus
                  required
                  maxLength={160}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="What would you like to get done?"
                />
              </label>
              <label>
                Status
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as Status)}
                >
                  {statuses.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={priority}
                  onChange={(event) => setPriority(event.target.checked)}
                />{" "}
                Star this task as a priority
              </label>
              <div className="dialog-footer">
                <button type="button" onClick={() => setCreating(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary"
                  disabled={!title.trim()}
                >
                  {editing ? "Save changes" : "Create task"}
                </button>
              </div>
            </form>
          </dialog>
        </div>
      )}
    </div>
  );
}
export default App;
