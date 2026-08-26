'use client';

import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

// Registration has to happen before any grid renders. Keeping it in this module means it
// runs when the lazy chunk loads, which is necessarily before the component below mounts.
ModuleRegistry.registerModules([AllCommunityModule]);

/**
 * Thin pass-through around `AgGridReact` whose only job is to own the ag-grid imports.
 *
 * ag-grid plus its two stylesheets is the heaviest dependency on the goals page, and it is
 * only reachable from two of five tabs — neither of them the default. Isolating the imports
 * here lets the page load it through `next/dynamic` instead of on first paint.
 */
export default function DataGrid(props) {
  return <AgGridReact {...props} />;
}
