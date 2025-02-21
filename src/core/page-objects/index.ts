export * from './types';
export * from './base.page';
export * from './base.component';
export * from './components';

import { BasePageObject } from './base.page';
import { BaseComponentObject } from './base.component';
import components from './components';

export default {
  BasePageObject,
  BaseComponentObject,
  components,
};
