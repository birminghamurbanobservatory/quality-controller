import {BadRequest} from '../../../errors/BadRequest';

export class InvalidCheck extends BadRequest {

  public constructor(message = 'Invalid check') {
    super(message); // 'Error' breaks prototype chain here
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
  }

}