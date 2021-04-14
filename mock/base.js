class Base {
  constructor() {
    this.data = {};
  }

  del(keys) {
    let result = 0;
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const value = this.data[key];
      if (value) {
        delete this.data[key];
        result += 1;
      }
    }
    return result;
  }

  set(key, value) {
    this.data[key] = value;
    return 'OK';
  }

  get(key) {
    return this.data[key] || null;
  }
}

export default Base;
