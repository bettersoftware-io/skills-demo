interface ImportMetaEnv {
  /** The price server's WebSocket URL. Unset or empty: the in-browser simulator. */
  readonly VITE_SERVER_URL?: string;
  /** The origin of the directory's REST API, such as http://localhost:4000. Unset or empty: the in-browser simulator. */
  readonly VITE_API_URL?: string;
}
