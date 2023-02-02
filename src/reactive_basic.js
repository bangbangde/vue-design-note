/*************************  第 4 章  *******************************
 * 响应系统 V0.8 实现 watch
 * 优化：
 *  - 支持 watch 回调立即执行
 *  - 提供竞态问题解决方案
 * 缺陷：
 *  - 
 */
0 && function() {
  // 存储副作用函数的桶, 原始数据对象作为 key，value 则是 “字段-副作用函数” 的 Map（depsMap）
  const bucket = new WeakMap();

  // 当前正在执行的副作用函数的引用
  let activeEffect;

  let effectStack = [];

  function effect(fn, options = {}) {
    const effectFn = () => {
      cleanup(effectFn);
      activeEffect = effectFn;
      effectStack.push(effectFn);
      const res = fn();
      effectStack.pop();
      activeEffect = effectStack[effectStack.length - 1];
      return res;
    }
    effectFn.options = options;
    // 存储相关的依赖【收集逻辑在 track 函数中】
    effectFn.deps = [];
    if (!options.lazy) {
      effectFn();
    }
    return effectFn;
  }

  
  function computed(getter) {
    let value; // 缓存计算值
    let dirty = true;
    const effectFn = effect(getter, {
      lazy: true,
      scheduler(fn) {
        if (!dirty) {
          dirty = true;
          trigger(obj, 'value');
        }
      }
    });
    const obj = {
      get value() {
        if (dirty) {
          value = effectFn();
          dirty = false;
        }
        track(obj, 'value');
        return value;
      }
    }
    return obj;
  }

  function traverse(value, seen = new Set()) {
    if (typeof value !== 'object' || value === null || seen.has(value)) return;
    seen.add(value);
    // 未处理数组类型等其他结构
    for (const k in value) {
      traverse(value[k], seen);
    }
    return value;
  }

  // source 可以是 响应式对象、读取响应式数据的 getter
  function watch(source, cb, options) {
    let getter, newVal, oldVal, cleanup;
    if (typeof source === 'function') {
      getter = source;
    } else {
      getter = () => traverse(source);
    }

    const job = () => {
      newVal = effectFn();
      if (cleanup) {
        cleanup();
      }
      cb(newVal, oldVal, onInvalidate);
      oldVal = newVal;
    }

    function onInvalidate(fn) {
      cleanup = fn;
    }

    const effectFn = effect(
      () => getter(),
      {
        lazy: true,
        scheduler() {
          if (options?.flush === 'post') {
            Promise.resolve().then(job);
          } else {
            job();
          }
        }
      }
    );

    if (options?.immediate) {
      job();
    } else {
      oldVal = effectFn();
    }
  }

  function track(target, key) {
    if (!activeEffect) return;
      
    // key -  effects
    let depsMap = bucket.get(target);
    if (!depsMap) {
      depsMap = new Map();
      bucket.set(target, depsMap);
    }

    // effects
    let deps = depsMap.get(key);
    if (!deps) {
      deps = new Set();
      depsMap.set(key, deps);
    }

    deps.add(activeEffect);

    // 这样后续清理的时候就能直接从deps里删除自己了
    activeEffect.deps.push(deps);
  }

  function trigger(target, key) {
    const depsMap = bucket.get(target);
    if (!depsMap) return true;
    const effects = depsMap.get(key);

    Array.from(effects).filter(effectFn => effectFn !== activeEffect).forEach(effectFn => {
      if (effectFn.options?.scheduler) {
        effectFn.options.scheduler(effectFn); // 交出副作用执行函数
      } else {
        effectFn();
      }
    });
  }

  function cleanup(effectFn) {
    effectFn.deps.forEach(item => item.delete(effectFn));
    effectFn.deps.length = 0;
  }

  const data = { val: 0 };

  const obj = new Proxy(data, {
    get(target, key) {
      track(target, key);
      return target[key];
    },
    set(target, key, val) {
      target[key] = val;
      trigger(target, key);
      return true;
    }
  });

  /************/
  // 注册一个匿名副作用函数
  watch(() => obj.val, (val, ov, onInvalidate) => {
    let expired = false;
    onInvalidate(() => {
      expired = true;
    });

    const delay = 2000 + Math.random() * 1000;

    setTimeout(() => {
      if (expired) {
        console.log(val, '数据过期', delay);
      } else {
        console.log(val, '请求完成', delay);
      }
    }, delay);

    console.log('value changed', val, ov);
  }, {
    immediate: true,
    // flush: 'post' // pre post sync
  })

  setTimeout(() => {
    obj.val++;
    obj.val++;
  }, 1000);

}();

/********************************************************
 * 响应系统 V0.7 实现 computed & lazy
 * 优化：
 *  -
 * 缺陷：
 *  - 
 */
0 && function() {
  // 存储副作用函数的桶, 原始数据对象作为 key，value 则是 “字段-副作用函数” 的 Map（depsMap）
  const bucket = new WeakMap();

  // 当前正在执行的副作用函数的引用
  let activeEffect;

  let effectStack = [];

  function effect(fn, options = {}) {
    const effectFn = () => {
      cleanup(effectFn);
      activeEffect = effectFn;
      effectStack.push(effectFn);
      const res = fn();
      effectStack.pop();
      activeEffect = effectStack[effectStack.length - 1];
      return res;
    }
    effectFn.options = options;
    // 存储相关的依赖【收集逻辑在 track 函数中】
    effectFn.deps = [];
    if (!options.lazy) {
      effectFn();
    }
    return effectFn;
  }

  function track(target, key) {
    if (!activeEffect) return;
      
    // key -  effects
    let depsMap = bucket.get(target);
    if (!depsMap) {
      depsMap = new Map();
      bucket.set(target, depsMap);
    }

    // effects
    let deps = depsMap.get(key);
    if (!deps) {
      deps = new Set();
      depsMap.set(key, deps);
    }

    deps.add(activeEffect);

    // 这样后续清理的时候就能直接从deps里删除自己了
    activeEffect.deps.push(deps);
  }

  function trigger(target, key) {
    const depsMap = bucket.get(target);
    if (!depsMap) return true;
    const effects = depsMap.get(key);

    Array.from(effects).filter(effectFn => effectFn !== activeEffect).forEach(effectFn => {
      if (effectFn.options?.scheduler) {
        effectFn.options.scheduler(effectFn); // 交出副作用执行函数
      } else {
        effectFn();
      }
    });
  }

  function cleanup(effectFn) {
    effectFn.deps.forEach(item => item.delete(effectFn));
    effectFn.deps.length = 0;
  }

  function computed(getter) {
    let value; // 缓存计算值
    let dirty = true;
    const effectFn = effect(getter, {
      lazy: true,
      scheduler(fn) {
        if (!dirty) {
          dirty = true;
          trigger(obj, 'value');
        }
      }
    });
    const obj = {
      get value() {
        if (dirty) {
          value = effectFn();
          dirty = false;
        }
        track(obj, 'value');
        return value;
      }
    }
    return obj;
  }
  const data = { val: 0 };

  const obj = new Proxy(data, {
    get(target, key) {
      track(target, key);
      return target[key];
    },
    set(target, key, val) {
      target[key] = val;
      trigger(target, key);
      return true;
    }
  });

  /************/
  // 注册一个匿名副作用函数
  effect(
    () => {
      var cp = computed(() => obj.val + '...');
      console.log(cp.value);
    }
  );

  setTimeout(() => {
    obj.val++;
  }, 1000);

}();

/********************************************************
 * 响应系统 V0.6 调度执行
 * 优化：
 *  - 支持配置副作用函数执行逻辑
 * 缺陷：
 *  - 
 */
0 && function() {
  // 存储副作用函数的桶, 原始数据对象作为 key，value 则是 “字段-副作用函数” 的 Map（depsMap）
  const bucket = new WeakMap();

  // 当前正在执行的副作用函数的引用
  let activeEffect;

  let effectStack = [];

  function effect(fn, options = {}) {
    const effectFn = () => {
      cleanup(effectFn);
      activeEffect = effectFn;
      effectStack.push(effectFn);
      fn();
      effectStack.pop();
      activeEffect = effectStack[effectStack.length - 1];
    }
    effectFn.options = options;
    // 存储相关的依赖【收集逻辑在 track 函数中】
    effectFn.deps = [];
    effectFn();
  }

  function track(target, key) {
    if (!activeEffect) return;
      
    // key -  effects
    let depsMap = bucket.get(target);
    if (!depsMap) {
      depsMap = new Map();
      bucket.set(target, depsMap);
    }

    // effects
    let deps = depsMap.get(key);
    if (!deps) {
      deps = new Set();
      depsMap.set(key, deps);
    }

    deps.add(activeEffect);

    // 这样后续清理的时候就能直接从deps里删除自己了
    activeEffect.deps.push(deps);
  }

  function trigger(target, key) {
    const depsMap = bucket.get(target);
    if (!depsMap) return true;
    const effects = depsMap.get(key);

    Array.from(effects).filter(effectFn => effectFn !== activeEffect).forEach(effectFn => {
      if (effectFn.options?.scheduler) {
        effectFn.options.scheduler(effectFn); // 交出副作用执行函数
      } else {
        effectFn();
      }
    });
  }

  function cleanup(effectFn) {
    effectFn.deps.forEach(item => item.delete(effectFn));
    effectFn.deps.length = 0;
  }

  const data = { val: 0 };

  const obj = new Proxy(data, {
    get(target, key) {
      track(target, key);
      return target[key];
    },
    set(target, key, val) {
      target[key] = val;
      trigger(target, key);
      return true;
    }
  });

  /************/
  const queue = new Set();
  const pm = Promise.resolve();
  let isFlushing = false;
  const flush = () => {
    if (isFlushing) return;
    isFlushing = true;
    pm.then(() => {
      queue.forEach(fn => fn());
    }).finally(() => {
      isFlushing = false;
    })
  };

  // 注册一个匿名副作用函数
  effect(
    // 
    () => {
      console.log(obj.val++);
    }, {
      scheduler(fn) {
        queue.add(fn);
        flush();
      }
    }
  );

  setTimeout(() => {
    obj.val++;
    obj.val++;
  }, 1000);

}();

/********************************************************
 * 响应系统 V0.5
 * 优化：
 *  - 支持嵌套的 effect
 *  - 避免无限循环递归
 * 缺陷：
 *  - 
 */
0 && function() {
  // 存储副作用函数的桶, 原始数据对象作为 key，value 则是 “字段-副作用函数” 的 Map（depsMap）
  const bucket = new WeakMap();

  // 当前正在执行的副作用函数的引用
  let activeEffect;

  let effectStack = [];

  function effect(fn) {
    const effectFn = () => {
      cleanup(effectFn);
      activeEffect = effectFn;
      effectStack.push(effectFn);
      fn();
      effectStack.pop();
      activeEffect = effectStack[effectStack.length - 1];
    }
    // 存储相关的依赖【收集逻辑在 track 函数中】
    effectFn.deps = [];
    effectFn();
  }

  function track(target, key) {
    if (!activeEffect) return;
      
    // key -  effects
    let depsMap = bucket.get(target);
    if (!depsMap) {
      depsMap = new Map();
      bucket.set(target, depsMap);
    }

    // effects
    let deps = depsMap.get(key);
    if (!deps) {
      deps = new Set();
      depsMap.set(key, deps);
    }

    deps.add(activeEffect);

    // 这样后续清理的时候就能直接从deps里删除自己了
    activeEffect.deps.push(deps);
  }

  function trigger(target, key) {
    const depsMap = bucket.get(target);
    if (!depsMap) return true;
    const effects = depsMap.get(key);

    Array.from(effects).filter(effectFn => effectFn !== activeEffect).forEach(effectFn => effectFn());
  }

  function cleanup(effectFn) {
    effectFn.deps.forEach(item => item.delete(effectFn));
    effectFn.deps.length = 0;
  }

  const data = { val: 0 };

  const obj = new Proxy(data, {
    get(target, key) {
      track(target, key);
      return target[key];
    },
    set(target, key, val) {
      target[key] = val;
      trigger(target, key);
      return true;
    }
  });

  /************/

  // 注册一个匿名副作用函数
  effect(
    // 
    () => {
      console.log(obj.val++);
    }
  );

  setTimeout(() => {
    obj.val++;
  }, 1000);

}();

/********************************************************
 * 响应系统 V0.4
 * 优化：
 *  - 分支切换与清理工作【P50】
 *    - 每次副作用函数执行时，先将其从所有依赖集合中删除，执行过程中重新收集依赖
 *      - 为了方便删除，在函数上新增属性记录其依赖的所有字段
 * 缺陷：
 *  - 
 */
0 && function() {
  // 存储副作用函数的桶, 原始数据对象作为 key，value 则是 “字段-副作用函数” 的 Map（depsMap）
  const bucket = new WeakMap();

  // 当前正在执行的副作用函数的引用
  let activeEffect;

  function effect(fn) {
    const effectFn = () => {
      cleanup(effectFn);
      activeEffect = effectFn;
      fn();
    }
    // 存储相关的依赖【收集逻辑在 track 函数中】
    effectFn.deps = [];
    effectFn();
  }

  function track(target, key) {
    if (!activeEffect) return;
      
    // key -  effects
    let depsMap = bucket.get(target);
    if (!depsMap) {
      depsMap = new Map();
      bucket.set(target, depsMap);
    }

    // effects
    let deps = depsMap.get(key);
    if (!deps) {
      deps = new Set();
      depsMap.set(key, deps);
    }

    deps.add(activeEffect);

    // 这样后续清理的时候就能直接从deps里删除自己了
    activeEffect.deps.push(deps);
  }

  function trigger(target, key) {
    const depsMap = bucket.get(target);
    if (!depsMap) return true;
    const effects = depsMap.get(key);

    const effectsToRun = new Set(effects);
    effectsToRun.forEach(effectFn => effectFn());
  }

  function cleanup(effectFn) {
    effectFn.deps.forEach(item => item.delete(effectFn));
    effectFn.deps.length = 0;
  }

  const data = { val: 0 };

  const obj = new Proxy(data, {
    get(target, key) {
      track(target, key);
      return target[key];
    },
    set(target, key, val) {
      target[key] = val;
      trigger(target, key);
      return true;
    }
  });

  /************/

  // 注册一个匿名副作用函数
  effect(
    // 
    () => {
      console.log(obj.val);
    }
  );

  setTimeout(() => {
    obj.val = 1;
  }, 1000);

}();

/********************************************************
 * 响应系统 V0.3
 * 优化：
 *  - 简单封装一下
 * 缺陷：
 *  - 
 */
0 && function() {
  // 存储副作用函数的桶, 原始数据对象作为 key，value 则是 “字段-副作用函数” 的 Map（depsMap）
  const bucket = new WeakMap();

  // 当前正在执行的副作用函数的引用
  let activeEffect;

  function effect(fn) {
    activeEffect = fn;
    fn();
  }

  function track(target, key) {
    if (!activeEffect) return;
      
    // key -  effects
    let depsMap = bucket.get(target);
    if (!depsMap) {
      depsMap = new Map();
      bucket.set(target, depsMap);
    }

    // effects
    let deps = depsMap.get(key);
    if (!deps) {
      deps = new Set();
      depsMap.set(key, deps);
    }

    deps.add(activeEffect);
  }

  function trigger(target, key) {
    const depsMap = bucket.get(target);
    if (!depsMap) return true;
    const effects = depsMap.get(key);
    effects && effects.forEach(fn => fn());
  }

  const data = { val: 0 };

  const obj = new Proxy(data, {
    get(target, key) {
      track(target, key);
      return target[key];
    },
    set(target, key, val) {
      target[key] = val;
      trigger(target, key);
      return true;
    }
  });

  /************/

  // 注册一个匿名副作用函数
  effect(
    // 
    () => {
      console.log(obj.val);
    }
  );

  setTimeout(() => {
    obj.val2 = 1;
  }, 1000);

}();

/********************************************************
 * 响应系统 V0.2
 * 优化：
 *  - 在副作用函数与依赖的字段之间建立明确的关系
 * 缺陷：
 *  - 
 */
0 && function() {
  // 存储副作用函数的桶, 原始数据对象作为 key，value 则是 “字段-副作用函数” 的 Map（depsMap）
  const bucket = new WeakMap();

  // 当前正在执行的副作用函数的引用
  let activeEffect;

  function effect(fn) {
    activeEffect = fn;
    fn();
  }

  const data = { val: 0 };

  const obj = new Proxy(data, {
    get(target, key) {
      if (!activeEffect) return;
      
      // key -  effects
      let depsMap = bucket.get(target);
      if (!depsMap) {
        depsMap = new Map();
        bucket.set(target, depsMap);
      }

      // effects
      let deps = depsMap.get(key);
      if (!deps) {
        deps = new Set();
        depsMap.set(key, deps);
      }

      deps.add(activeEffect);

      return target[key];
    },
    set(target, key, val) {
      target[key] = val;
      
      const depsMap = bucket.get(target);
      if (!depsMap) return true;
      const effects = depsMap.get(key);
      effects && effects.forEach(fn => fn());
      
      return true;
    }
  });

  /************/

  // 注册一个匿名副作用函数
  effect(
    // 
    () => {
      console.log(obj.val);
    }
  );

  setTimeout(() => {
    obj.val2 = 1;
  }, 1000);

}();

/********************************************************
 * 响应系统 V0.1
 * 优化：
 *  - 使用了 activeEffect 存储副作用函数，不再依赖副作用函数名
 * 缺陷：
 *  - set 拦截了所有赋值操作，都会使副作用函数重新运行
 */
0 && function() {
  // 当前正在执行的副作用函数的引用
  let activeEffect;

  function effect(fn) {
    activeEffect = fn;
    fn();
  }

  const bucket = new Set();
  const data = { val: 0 };

  const obj = new Proxy(data, {
    get(target, key) {
      if (activeEffect) {
        bucket.add(activeEffect);
      }
      return target[key];
    },
    set(target, key, val) {
      target[key] = val;
      bucket.forEach(fn => fn());
      return true;
    }
  });

  /************/

  // 注册一个匿名副作用函数
  effect(
    // 
    () => {
      console.log(obj.val);
    }
  );

  setTimeout(() => {
    obj.val2++;
  }, 1000);

}();

// 响应式数据的基本实现原理演示
0 && function() {
const bucket = new Set();

const data = { val: 0 };

const obj = new Proxy(data, {
  get(target, key) {
    bucket.add(effect);
    return target[key];
  },
  set(target, key, val) {
    target[key] = val;
    bucket.forEach(fn => fn());
    return true;
  }
});

function effect() {
  console.log('effect:', obj.val);
}

effect();

setTimeout(() => {
  obj.val++;
}, 1000);
}();
