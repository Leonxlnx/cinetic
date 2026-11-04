// Fixture: sync.ts as the starter writes it, with Chain's declares() and nothing for LineSnap.
import { declares as chainDeclares } from './fx/Chain';

export const declares = () => [{ id: 'chain', ...chainDeclares({}) }];
