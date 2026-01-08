import { Procedure } from '../Procedure.js';
import { PROCEDURES } from '../../global.js';
import procedureContent from './procedure.md';

PROCEDURES['understand_project'] = new Procedure({
  name: 'understand_project',
  procedureContent,
});
