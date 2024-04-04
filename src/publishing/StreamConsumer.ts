import * as stream from 'stream';

export class StreamConsumer extends stream.Writable {
    public store: any;
    constructor(store: any) {
        super({ objectMode: true });
        this.store = store;
    }

    _write(quad: any, encoding: any, done: any) {
        this.store.add(quad);
        done();
    }
    get_writer(){
        return this;
    }
}