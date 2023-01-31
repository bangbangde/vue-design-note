# vue 响应系统的实现方案

vue 基于响应式数据和副作用函数构建响应系统。其响应式数据依赖 ES2015+ 的 proxy 特性。

## 响应式数据原理演示

下面是一个副作用函数：

```js
const obj = { val: 0 };

function effect() {
  console.log(obj.val);
}
```

vue 实现了当 obj.val 的值发生变化时，副作用函数 effect 会重新执行。

其实现方案可以简化为：

- 拦截读取 obj.val 的操作，当读取时将副作用函数 effect 存储起来
- 拦截设置 obj.val 的操作，当设置时取出 effect 函数并执行

实现伪代码如下：

```js
const bucket = new Set();

const data = { val: 0 };

const obj = new Proxy(data, {
  get(target, key) {
    bucket.add(effect);
    return target;
  },
  set(target, key, newVal) {
    target[key] = newVal;
    bucket.forEach(fn => fn());
    return true;
  }
});

function effect() {
  console.log('effect:', obj.val);
}

effect();

setTimeOut(() => {
  obj.val++;
}, 1000);
```

## 完善的响应系统
[code](../../src/playground.js)