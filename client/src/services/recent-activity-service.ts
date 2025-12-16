import { fontSizes } from "@/styles/fontSizes";
import { styles } from "@/styles/styles";
import { GameActivity, UserProfile } from "types/types";
import { getUserById } from "./get-user-by-id";

let ws: WebSocket | null = null;

function createUserLink(user: UserProfile): HTMLAnchorElement {
  const link = document.createElement("a");
  link.href = `/members/${user.id}`;
  link.setAttribute("data-link", "");
  link.className =
    "text-pong-dark-secondary font-semibold hover:underline transition";
  link.textContent = user.username;

  return link;
}

function WinActivity(
  user: UserProfile,
  targetUser: UserProfile,
  activity: GameActivity
): HTMLLIElement {
  const li = document.createElement("li");
  li.className = `${styles.listStyle} flex items-center justify-between`;

  const leftDiv = document.createElement("div");
  leftDiv.className = "flex items-start gap-2";
  leftDiv.innerHTML = `<i class="fas fa-trophy text-pong-success mt-1"></i>`;

  const textDiv = document.createElement("div");
  textDiv.appendChild(createUserLink(user));
  textDiv.insertAdjacentHTML(
    "beforeend",
    `<span class="text-pong-dark-primary"> won a match against </span>`
  );
  textDiv.appendChild(createUserLink(targetUser));
  leftDiv.appendChild(textDiv);

  const scoreDiv = document.createElement("div");
  scoreDiv.className = `text-pong-dark-secondary font-semibold ${fontSizes.smallTextFontSize}`;

  const userScore =
    activity.playerId === 1
      ? activity.leftPlayerScore
      : activity.rightPlayerScore;

  const enemyScore =
    activity.playerId === 1
      ? activity.rightPlayerScore
      : activity.leftPlayerScore;

  scoreDiv.textContent = `${userScore} - ${enemyScore}`;

  li.appendChild(leftDiv);
  li.appendChild(scoreDiv);

  return li;
}

function LossActivity(
  user: UserProfile,
  targetUser: UserProfile,
  activity: GameActivity
): HTMLLIElement {
  const li = document.createElement("li");
  li.className = `${styles.listStyle} flex items-center justify-between`;

  const leftDiv = document.createElement("div");
  leftDiv.className = "flex items-start gap-2";
  leftDiv.innerHTML = `<i class="fas fa-skull-crossbones text-pong-error mt-1"></i>`;

  const textDiv = document.createElement("div");
  textDiv.appendChild(createUserLink(user));
  textDiv.insertAdjacentHTML(
    "beforeend",
    `<span class="text-pong-dark-primary"> lost a match to </span>`
  );
  textDiv.appendChild(createUserLink(targetUser));
  leftDiv.appendChild(textDiv);

  const scoreDiv = document.createElement("div");
  scoreDiv.className = `text-pong-dark-secondary font-semibold ${fontSizes.smallTextFontSize}`;

  const userScore =
    activity.playerId === 1
      ? activity.leftPlayerScore
      : activity.rightPlayerScore;

  const enemyScore =
    activity.playerId === 1
      ? activity.rightPlayerScore
      : activity.leftPlayerScore;

  scoreDiv.textContent = `${userScore} - ${enemyScore}`;

  li.appendChild(leftDiv);
  li.appendChild(scoreDiv);

  return li;
}

async function renderActivity(
  activity: GameActivity
): Promise<HTMLLIElement | null> {
  if (!activity.userId || !activity.enemyId || !activity.gameEndResult)
    return null;

  const user = await getUserById(activity.userId);
  const targetUser = await getUserById(activity.enemyId);

  if (!user || !targetUser) return null;

  switch (activity.gameEndResult) {
    case "Won":
      return WinActivity(user, targetUser, activity);
    case "Lost":
      return LossActivity(user, targetUser, activity);
    default:
      return null;
  }
}

export async function startRecentActivityListener(): Promise<void> {
  ws = new WebSocket(`wss://${window.location.host}/game/recent-activity`);

  const ul = document.getElementById("recent-activity-list");
  
  // Track which matches we've already rendered (in-memory only, reset on page load)
  const renderedMatches = new Set<string>();

  ws.onopen = () => {
    // Clear the list when connection opens
    if (ul) {
      ul.innerHTML = `<li class="text-pong-dark-secondary text-center">Loading recent matches...</li>`;
    }
  };

  ws.onmessage = async (event: MessageEvent) => {
    let incoming: GameActivity[];
    try {
      incoming = JSON.parse(event.data);
    } catch {
      return;
    }

    if (incoming.length === 0) {
      if (ul && ul.children.length === 0) {
        ul.innerHTML = `<li class="text-pong-dark-secondary text-center">No matches have been played in the BEEPONG yet — be the first to serve!</li>`;
      }
      return;
    }

    // Clear loading message on first data
    if (ul && ul.querySelector('.text-center')) {
      ul.innerHTML = "";
    }

    // Deduplicate incoming activities: keep only unique matches
    // Each match generates 2 game records (one per player), we show only one
    const toRender: GameActivity[] = [];
    
    for (const act of incoming) {
      // Create unique key: smaller userId first to avoid duplicate matches
      const [id1, id2] = [act.userId, act.enemyId].sort();
      const matchKey = `${id1}-${id2}-${act.leftPlayerScore}-${act.rightPlayerScore}`;
      
      // Only render if we haven't seen this match yet
      if (!renderedMatches.has(matchKey)) {
        renderedMatches.add(matchKey);
        toRender.push(act);
      }
    }

    if (toRender.length === 0) return;

    // Render new activities
    for (const activity of toRender) {
      const elem = await renderActivity(activity);
      if (elem && ul) {
        ul.prepend(elem);
      }
    }

    // Keep only the most recent 20 activities displayed
    if (ul) {
      while (ul.children.length > 20) {
        ul.removeChild(ul.lastChild!);
      }
    }
  };

  ws.onerror = (error) => {
    if (ul) {
      ul.innerHTML = `<li class="text-pong-error text-center">Unable to load activity feed.</li>`;
    }
  };

  ws.onclose = () => {
    ws = null;
  };
}

export function stopRecentActivityListener() {
  if (ws) {
    ws.close();
    ws = null;
  }
}
