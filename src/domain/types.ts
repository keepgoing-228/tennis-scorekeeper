// --- Ruleset ---

export type BestOf = 1 | 3 | 5 | "practice";

export type Ruleset = {
  bestOf: BestOf;
  tiebreak: "none" | "7pt";
  matchType: "singles" | "doubles";
};

// --- Players & Teams ---

export type Player = { playerId: string; displayName: string };
export type Team = { teamId: "A" | "B"; players: Player[] };
export type TeamSide = "A" | "B";

// --- Game State ---

export type PointScore = 0 | 15 | 30 | 40 | "AD";

export type NormalGameState = {
  kind: "normal";
  pointsA: PointScore;
  pointsB: PointScore;
  deuce: boolean;
};

export type TiebreakGameState = {
  kind: "tiebreak";
  tbA: number;
  tbB: number;
  target: 7;
};

export type GameState = NormalGameState | TiebreakGameState;

// --- Set State ---

export type SetState = {
  gamesA: number;
  gamesB: number;
  game: GameState;
};

// --- Match State ---

export type MatchStatus = "in_progress" | "finished";

export type MatchState = {
  matchId: string;
  ruleset: Ruleset;
  teams: { A: Team; B: Team };
  sets: SetState[];
  currentSetIndex: number;
  setsWonA: number;
  setsWonB: number;
  server: TeamSide;
  status: MatchStatus;
  winner?: TeamSide;
};

// --- Events ---

export type BaseEvent = {
  eventId: string;
  matchId: string;
  createdAt: string;
  seq: number;
};

export type MatchCreatedEvent = BaseEvent & {
  type: "MATCH_CREATED";
  payload: {
    ruleset: Ruleset;
    teams: { A: Team; B: Team };
    initialServer: TeamSide;
  };
};

export type PointWonEvent = BaseEvent & {
  type: "POINT_WON";
  payload: { team: TeamSide };
};

export type UndoEvent = BaseEvent & {
  type: "UNDO";
  payload: { targetEventId: string };
};

export type RedoEvent = BaseEvent & {
  type: "REDO";
  payload: { targetEventId: string };
};

export type MatchEndedEvent = BaseEvent & {
  type: "MATCH_ENDED";
  payload: Record<string, never>;
};

export type MatchEvent =
  | MatchCreatedEvent
  | PointWonEvent
  | UndoEvent
  | RedoEvent
  | MatchEndedEvent;
