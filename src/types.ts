export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed?: string;
  last_updated?: string;
}

export interface AreaRegistryEntry {
  area_id: string;
  name: string;
  icon?: string | null;
  picture?: string | null;
}

export interface DeviceRegistryEntry {
  id: string;
  area_id: string | null;
  name?: string | null;
}

export interface EntityRegistryEntry {
  entity_id: string;
  area_id: string | null;
  device_id: string | null;
  hidden?: boolean;
}

export interface HassUser {
  id?: string;
  name?: string;
  is_admin?: boolean;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  language?: string;
  user?: HassUser;
  areas?: Record<string, AreaRegistryEntry>;
  devices?: Record<string, DeviceRegistryEntry>;
  entities?: Record<string, EntityRegistryEntry>;
  callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>
  ): Promise<unknown>;
  callApi?<T>(method: string, path: string): Promise<T>;
  callWS?<T>(msg: Record<string, unknown>): Promise<T>;
  formatEntityState?(stateObj: HassEntity): string;
}

/** Palier de densité : "auto" (selon la largeur de la carte) par défaut. */
export type AcdDensity = "auto" | "dense" | "minimal" | "full";

export interface LovelaceCardConfig {
  type: string;
  /** Force un palier de densité au lieu de l'adaptation automatique. */
  density?: AcdDensity;
  [key: string]: unknown;
}

export interface AcdLightCardConfig extends LovelaceCardConfig {
  entity: string;
  /** Optional list of lights browsable with ‹ › arrows (carousel). */
  entities?: string[];
  name?: string;
  icon?: string;
  /** Optional image shown instead of the icon (built-in key or URL). */
  image?: string;
  /** Vertical anchor of the image inside the card (default "top"). */
  image_position?: "top" | "center" | "bottom";
  /** Max width of the image, in % of the card (default 70). */
  image_size?: number;
  /** Vertical fine-tuning offset, in px (default 0). */
  image_offset?: number;
  /** Drops the central visual and moves the icon left of the title. */
  compact?: boolean;
  show_toggle?: boolean;
  show_brightness?: boolean;
  show_color_controls?: boolean;
  show_state?: boolean;
  /** Dialog opened when tapping the title or the visual:
   *  "custom" (ACD modal, default) or "native" (HA more-info). */
  info_dialog?: "custom" | "native";
}

export interface AcdCoverCardConfig extends LovelaceCardConfig {
  entity: string;
  /** Optional list of covers browsable with ‹ › arrows (carousel). */
  entities?: string[];
  name?: string;
  /** Drops the central visual and moves the icon left of the title. */
  compact?: boolean;
  show_buttons?: boolean;
  show_position?: boolean;
  show_state?: boolean;
  /** Inverts the displayed/sent position for reversed hardware. */
  invert_position?: boolean;
  /** Dialog opened when tapping the title or the visual:
   *  "custom" (ACD modal, default) or "native" (HA more-info). */
  info_dialog?: "custom" | "native";
}

export interface AcdRoomsCardConfig extends LovelaceCardConfig {
  /** Card title (default: "Pièces" / "Rooms"). */
  title?: string;
  /** Area ids to display, in order (default: all areas, alphabetical). */
  areas?: string[];
  /** Navigation path pattern for a row tap, "{area}" is replaced by the
   *  area id (e.g. "/lovelace/{area}"). No navigation if unset. */
  navigation_path?: string;
  /** Header action link, e.g. "Voir tout" → another view. */
  link_text?: string;
  link_path?: string;
  /** "auto" (default) switches to horizontal pills below `breakpoint`. */
  layout?: "auto" | "horizontal" | "list";
  /** Card width under which "auto" goes horizontal (default 450). */
  breakpoint?: number;
  /** Min width of a horizontal pill, in px (default 124). */
  pill_width?: number;
  /** Snap pills to the left edge when the drag is released. */
  snap?: boolean;
  /** Scrolls the room list instead of growing the card (list layout). */
  scroll?: boolean;
  /** Max list height in px when `scroll` is on (default: fills the card). */
  max_height?: number;
  show_counts?: boolean;
  /** Room icons (default: on in list layout, off in horizontal). */
  show_icons?: boolean;
  /** Shows the "+ Add room" button linking to HA's areas settings. */
  show_add_button?: boolean;
  /** Domains that make a room "active" (default: ["light", "cover"]). */
  active_domains?: string[];
}

export interface AcdHeaderCardConfig extends LovelaceCardConfig {
  /** Overrides the automatic time-based greeting. */
  greeting?: string;
  /** Overrides the displayed name (default: person entity, then HA user). */
  name?: string;
  subtitle?: string;
  /** Person entity used for the name and the avatar picture. */
  person_entity?: string;
  /** Avatar image URL, takes precedence over the person picture. */
  avatar?: string;
  avatar_path?: string;
  avatar_size?: number;
  /** Counter (> 0) or binary entity ("on") driving the bell dot. */
  notification_entity?: string;
  notification_path?: string;
  show_greeting?: boolean;
  time_based_greeting?: boolean;
  show_notifications?: boolean;
  show_avatar?: boolean;
}

export interface AcdSearchCardConfig extends LovelaceCardConfig {
  placeholder?: string;
  /** Room navigation pattern, {area} = area id, {slug} = name slug. */
  navigation_path?: string;
  /** Restricts the entity search to these domains (default: all). */
  domains?: string[];
  include_areas?: boolean;
  include_entities?: boolean;
  max_results?: number;
}

export interface AcdCameraCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  /** Room shown before the name (default: the entity's area). */
  area?: string;
  /** Full caption, replaces the "room · name" composition. */
  caption?: string;
  live_text?: string;
  /** CSS aspect ratio of the tile (default "16/9"). */
  aspect_ratio?: string;
  /** Fixed height in px — overrides `aspect_ratio`. */
  height?: number;
  /** Snapshot refresh period in seconds (default 10). */
  refresh_interval?: number;
  /** Uses `ha-camera-stream` when available instead of snapshots. */
  stream?: boolean;
  /** Static image URL instead of the camera feed (testing / placeholder). */
  image?: string;
  show_live_badge?: boolean;
  show_caption?: boolean;
}

export interface AcdSectionCardConfig extends LovelaceCardConfig {
  title?: string;
  subtitle?: string;
  link_text?: string;
  link_path?: string;
  /** External URL, takes precedence over `link_path`. */
  link_url?: string;
  title_size?: number;
}

export interface AcdStatsRowItem {
  entity: string;
  name?: string;
  icon?: string;
  unit?: string;
  decimals?: number;
  /** Per-tile opt-out of the trend line. */
  show_trend?: boolean;
  /** Per-tile width override, in px. */
  width?: number;
}

export interface AcdStatsRowCardConfig extends LovelaceCardConfig {
  /** Entity ids, or objects for per-tile overrides. Order is preserved. */
  entities: Array<string | AcdStatsRowItem>;
  title?: string;
  link_text?: string;
  link_path?: string;
  /** Tile width in px (default 132). */
  tile_width?: number;
  decimals?: number;
  show_trend?: boolean;
  /** Comparison window in hours (default 168 = one week). */
  graph_hours?: number;
  /** Trend caption (default derived from the window). */
  trend_label?: string;
  snap?: boolean;
}

export interface AcdStatCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  /** Unit override (default: the entity's unit_of_measurement). */
  unit?: string;
  /** Decimal places for numeric values (default: 1, trailing 0 trimmed). */
  decimals?: number;
  /** Font size of the main value, in px (default 26). */
  value_size?: number;
  show_icon?: boolean;
  /** Sparkline of the recent history (numeric sensors only). */
  show_graph?: boolean;
  /** Trend arrow + delta vs the start of the period (numeric only). */
  show_trend?: boolean;
  /** History window in hours for graph/trend (default 24). */
  graph_hours?: number;
  /** Text overrides for binary sensors. */
  state_on?: string;
  state_off?: string;
}

export interface AcdClimateCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  /** Dial range overrides (default: the entity's min_temp/max_temp). */
  min?: number;
  max?: number;
  /** Temperature step (default: target_temp_step or 0.5). */
  step?: number;
  /** Displayed unit (default "°C"). */
  unit?: string;
  /** Drops the dial and moves the icon left of the title. */
  compact?: boolean;
  show_toggle?: boolean;
  /** Mode chip in the footer (tap cycles hvac modes). */
  show_modes?: boolean;
  /** Current temperature chip in the footer. */
  show_current?: boolean;
}

export interface AcdCameraCardConfig extends LovelaceCardConfig {
  entity: string;
  /** Displayed name (default: the entity's friendly name). */
  name?: string;
  /** Room shown before the name (default: the entity's area). */
  area?: string;
  /** Full caption, replaces the "area · name" composition. */
  caption?: string;
  /** Badge text (default "Live"). */
  live_text?: string;
  /** CSS aspect ratio of the frame (default "16/9"). */
  aspect_ratio?: string;
  /** Fixed height in px — overrides `aspect_ratio` when set. */
  height?: number;
  /** Snapshot refresh period in seconds (default 10, snapshot mode only). */
  refresh_interval?: number;
  /** Live video stream instead of the refreshed snapshot (default false). */
  stream?: boolean;
  show_live_badge?: boolean;
  show_caption?: boolean;
  /** Static image URL, bypasses the camera entity (previews/mockups). */
  image?: string;
}

export interface AcdPersonsCardConfig extends LovelaceCardConfig {
  /** Card title (optional, none by default). */
  title?: string;
  /** Person entities to display (default: all person.*, alphabetical). */
  entities?: string[];
  /** "x home / y away" count on the right. */
  show_count?: boolean;
  /** First names under the avatars (disables overlap). */
  show_names?: boolean;
  /** Avatar diameter in px (default 44). */
  avatar_size?: number;
}

export interface AcdSidebarItem {
  icon: string;
  /** Tooltip / optional label under the icon. */
  label?: string;
  /** Navigation path (e.g. "/eso-home/accueil"). */
  path?: string;
  /** Special action instead of navigation: "menu" opens the HA drawer. */
  action?: "menu";
}

export interface AcdSidebarCardConfig extends LovelaceCardConfig {
  /** "auto" (default) becomes a bottom tab bar below `breakpoint`. */
  mode?: "auto" | "rail" | "tabbar";
  /** Viewport width under which "auto" switches to the tab bar (870). */
  breakpoint?: number;
  /** Labels under the tab bar icons (default true). */
  tabbar_labels?: boolean;
  /** Main navigation items (top of the rail). */
  items?: AcdSidebarItem[];
  /** Items pinned at the bottom of the rail. */
  bottom_items?: AcdSidebarItem[];
  /** Short text logo at the top (default "ES"). */
  logo?: string;
  /** Hides the HA top header while the rail is displayed (default true). */
  hide_header?: boolean;
  /** Hides HA's own sidebar while the rail is displayed (default true). */
  hide_ha_sidebar?: boolean;
  /** Shows labels under the icons (default false). */
  show_labels?: boolean;
  /** Rail width in px (default 76). */
  width?: number;
}

export type AcdChartPeriod = "week" | "month" | "year";

export interface AcdChartCardConfig extends LovelaceCardConfig {
  entity: string;
  title?: string;
  /** Unit shown next to the title (default: the entity's unit). */
  unit?: string;
  /** "sum" = consumption per bucket (energy), "mean" = average. */
  stat_type?: "sum" | "mean" | "max" | "min";
  /** Periods offered by the chips (default: all three). */
  periods?: AcdChartPeriod[];
  /** Period selected on load (default "week"). */
  default_period?: AcdChartPeriod;
  decimals?: number;
  /** Chart height in px, axes excluded (default 170). */
  height?: number;
  /** Highlights the highest bar when nothing is selected (default true). */
  highlight_max?: boolean;
  show_axis?: boolean;
  show_selector?: boolean;
  /** Rounded bar radius in px (default 10). */
  bar_radius?: number;
}

export interface AcdVacuumCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  /** Secondary line (default: "1 appareil" / the vacuum state). */
  subtitle?: string;
  /** Battery entity override (default: the vacuum's battery attribute). */
  battery_entity?: string;
  /** Illustration: built-in key ("robot", "robot-dock") or an image URL. */
  image?: string;
  /** Max width of the illustration, in % of the card (default 62). */
  image_size?: number;
  show_toggle?: boolean;
  show_battery?: boolean;
  /** Return-to-base and pause buttons in the footer. */
  show_actions?: boolean;
  show_state?: boolean;
}

export interface AcdFanCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  /** Number of power levels shown as pills. Auto-detected from the entity's
   *  `percentage_step` attribute when unset — works with any fan regardless
   *  of how many real speeds it supports. */
  levels?: number;
  show_toggle?: boolean;
  show_state?: boolean;
}

export interface AcdDeviceCardConfig extends LovelaceCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  /** Replaces the state line under the name. */
  subtitle?: string;
  /** Replaces the computed footer line. */
  footer?: string;
  /** Moves the icon chip left of the title, on a single line. */
  compact?: boolean;
  show_toggle?: boolean;
  /** Level bar (brightness, position, volume, speed…) when available. */
  show_bar?: boolean;
  show_footer?: boolean;
}

export type AcdDevicesFilter = "all" | "active" | "offline";

export interface AcdDevicesCardConfig extends LovelaceCardConfig {
  /** Area id: the grid fills itself from it. */
  area?: string;
  /** Explicit entity list, takes precedence over `area`. */
  entities?: string[];
  title?: string;
  /** Domains kept from the area (default: controllable ones). */
  domains?: string[];
  exclude?: string[];
  /** Entity ids pinned first, in order. */
  priority?: string[];
  /** Per-entity card config override, e.g. a different card type. */
  card_overrides?: Record<string, Record<string, unknown>>;
  show_header?: boolean;
  show_filters?: boolean;
  show_count?: boolean;
  show_add_button?: boolean;
  /** Minimum tile width in px, drives the column count (default 190). */
  min_tile_width?: number;
  columns?: number;
}

export interface AcdScenesCardConfig extends LovelaceCardConfig {
  area?: string;
  entities?: string[];
  /** Highlights the most recently applied scene (default true). */
  highlight_last?: boolean;
  show_add_button?: boolean;
  snap?: boolean;
}

export interface AcdRoomSummaryCardConfig extends LovelaceCardConfig {
  area?: string;
  entities?: string[];
  title?: string;
  domains?: string[];
  exclude?: string[];
  show_counts?: boolean;
  /** "Turn everything off" block. */
  show_master?: boolean;
  show_add_button?: boolean;
  add_path?: string;
}

export interface AcdDatetimeCardConfig extends LovelaceCardConfig {
  /** Weather entity feeding the right-hand block. */
  weather_entity?: string;
  /** Seconds next to the clock (default false). */
  show_seconds?: boolean;
  show_weather?: boolean;
  /** Time-based greeting above the clock (default true). */
  show_greeting?: boolean;
  /** Today's low / high, fetched from `weather.get_forecasts`. */
  show_range?: boolean;
}

export interface AcdPageHeaderCardConfig extends LovelaceCardConfig {
  /** Area id: the title falls back to its name. */
  area?: string;
  title?: string;
  subtitle?: string;
  /** Breadcrumb parent label and target (default "Accueil"). */
  parent_text?: string;
  parent_path?: string;
  /** Back button target; empty goes back in history. */
  back_path?: string;
  show_back?: boolean;
  show_breadcrumb?: boolean;
}

export interface AcdPersonBadgeConfig {
  type: string;
  entity: string;
  /** Displayed label (default: the person's first name). */
  name?: string;
  show_name?: boolean;
  /** Status text next to the name ("À la maison", "Absent", zone). */
  show_state?: boolean;
}

declare global {
  interface Window {
    customCards?: Array<{
      type: string;
      name: string;
      description: string;
      preview?: boolean;
      documentationURL?: string;
    }>;
    customBadges?: Array<{
      type: string;
      name: string;
      description: string;
      preview?: boolean;
      documentationURL?: string;
    }>;
  }
}
