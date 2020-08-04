import {Conflict} from '../../../errors/Conflict';

export class CheckAlreadyExists extends Conflict {

  public constructor(message = 'Check already exists.') {
    super(message); // 'Error' breaks prototype chain here
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain   
  }

}