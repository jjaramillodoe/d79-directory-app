'use client';

import {
  LayoutProvider,
  ThemeProvider,
  DataThemeProvider,
  ToastProvider,
  IconProvider,
} from '@once-ui-system/core';
import { style, dataStyle } from '../resources/once-ui.config';
import { iconLibrary } from '../resources/icons';

export function OnceUIProviders({ children }) {
  return (
    <LayoutProvider>
      <ThemeProvider
        theme={style.theme}
        brand={style.brand}
        accent={style.accent}
        neutral={style.neutral}
        solid={style.solid}
        solidStyle={style.solidStyle}
        border={style.border}
        surface={style.surface}
        transition={style.transition}
        scaling={style.scaling}
      >
        <DataThemeProvider
          variant={dataStyle.variant}
          mode={dataStyle.mode}
          height={dataStyle.height}
          axis={dataStyle.axis}
          tick={dataStyle.tick}
        >
          <ToastProvider>
            <IconProvider icons={iconLibrary}>
              {children}
            </IconProvider>
          </ToastProvider>
        </DataThemeProvider>
      </ThemeProvider>
    </LayoutProvider>
  );
}
