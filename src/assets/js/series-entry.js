// Series-player pages only (series-player.njk → base.njk): app.js stays small on every other page.
// A deferred module placed after app.js and before alpine.min.js, so seriesPlayer exists when Alpine starts.
import { seriesPlayer } from './modules/player.js';

window.seriesPlayer = seriesPlayer;
