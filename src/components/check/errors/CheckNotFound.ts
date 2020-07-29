import {NotFound} from '../../../errors/NotFound';

export class CheckNotFound extends NotFound {

  public constructor(message = 'Check could not be found') {
    super(message); // 'Error' breaks prototype chain here
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain   
  }

}