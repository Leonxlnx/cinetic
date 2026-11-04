// Fixture: the film declares what its primitives do on purpose.
import { declares as hardDeclares } from './fx/HardStep';
import { declares as zoomDeclares } from './fx/SnapZoom';

export const declares = () => [{ id: 'list', ...hardDeclares({ jump: 96, start: 30, every: 20, count: 4 }) }, { id: 'punch', ...zoomDeclares({ at: 200 }) }];
