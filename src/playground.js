/**
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

/**
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

/**
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

/**
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
