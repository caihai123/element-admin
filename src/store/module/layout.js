import Vue from "vue";
import router from "@/router";

// 将树转成一维数组
const flattenDeep = (array = []) => {
  let list = [];
  array.forEach((item) => deep(item));

  function deep(obj) {
    if (obj.children && obj.children.length) {
      obj.children.forEach((item) => deep(item));
    } else {
      list.push(obj);
    }
  }

  return list;
};

// 将路由和后端路由表对应
const mappingRouter = (routerList, menulist) => {
  initRouterPermis(routerList); // 初始化路由表

  if (!menulist.length) return;

  const find = routerList.find((item) => item.path === "/");
  find.children.forEach((item) => {
    let find = menulist.find((i) => i.path === item.path);
    if (find) {
      find.name = item.name;
      item.meta.title = find.title || item.meta.title || "";
      item.meta.icon = find.icon || item.meta.icon || "";
      item.meta.affix = find.affix || item.meta.affix;
      item.meta.permission = find.permission === false ? false : true;
    }
  });
};

// 初始化路由权限
function initRouterPermis(routerList) {
  const find = routerList.find((item) => item.path === "/");

  find.children.forEach((item) => {
    if (["Err401", "Err404", "redirect"].indexOf(item.name) !== -1) {
      item.meta.permission = true;
    } else {
      item.meta.permission = false;
    }
  });
}

let routerList = router.options.routes; // 前端注册的路由表

initRouterPermis(routerList);

let history = null; // 在tabs改变的时候记录之前的状态

// tabs 改变之后可能需要改变路由
function goRouter() {
  let fullPath = router.currentRoute.fullPath; //获取当前的路由
  let tabs = layout.state.tabs;

  // 如果当前路由还在当前的tabs中则不进行任何跳转
  if (tabs.some((item) => item.to === fullPath)) {
    return;
  }

  /**
   * 到这里的时候说明当前路由的tabs已经被删除
   * 跳转到当前tabs的后面一个还存在的tabs的路由
   */
  let index = history.findIndex((item) => item.to === fullPath);
  let len = history.length;
  for (let i = index + 1; i < len; i++) {
    if (tabs.some((item) => item.to === history[i].to)) {
      router.push(history[i].to);
      return;
    }
  }
  /**
   * 走到这里说明当前路由后面的tabs全部被删除或者根本就没有
   */
  router.push(tabs[tabs.length - 1].to);
}

const layout = {
  state: {
    isCollapse: false, //控制侧边栏展开收起状态
    menuList: [], // 侧边栏菜单对应的一维数组
    tabs: [], //tabs列表
    redirectName: "", // 正在刷新的name
  },
  getters: {
    include: (state) =>
      state.tabs
        .map((item) => item.name)
        .filter((item) => item !== state.redirectName),
  },
  mutations: {
    setCollapse(state, collapse) {
      state.isCollapse = collapse;
    },
    // 删除某一个缓存，用于刷新
    setRedirectName(state, name) {
      state.redirectName = name;
    },
    // 添加tabs
    addTabs(state, route) {
      history = Array.from(state.tabs);
      // 只要页面存在title和name就会生成tab
      if (route.meta && route.meta.title && route.name) {
        const index = state.tabs.findIndex((item) => item.path === route.path);
        const tab = {
          path: route.path,
          to: route.fullPath,
          name: route.name,
          title: route.meta.title,
          affix: route.meta.affix,
        };
        if (index !== -1) {
          Vue.set(state.tabs, index, tab);
        } else {
          state.tabs.push(tab);
        }
      }
    },

    // 删除一个tabs
    delTabs(state, route) {
      history = Array.from(state.tabs);
      if (!route || route.affix) return;
      state.tabs = state.tabs.filter((item) => {
        // 增加容错率 优先使用 路径 匹配 其次使用 name 匹配
        if (item.to !== route.to && item.to !== route.name) {
          return true;
        }
        return false;
      });

      goRouter();
    },

    // 删除其他 保留传入的一个
    closeOthers(state, route) {
      history = [...state.tabs];
      if (!route) return;
      state.tabs = state.tabs.filter(
        (item) => item.affix || item.to === route.to
      );
      goRouter();
    },

    /**
     * 清空tabs
     * 可以理解为恢复默认
     * 但是修改的时候需要保持tabs的顺序
     * */
    emptyTabs(state) {
      history = [...state.tabs];
      state.tabs = state.tabs.filter((item) => item.affix);
      goRouter();
    },

    // 替换tabs 用于排序
    replaceTabs(state, tabs) {
      state.tabs = tabs;
    },

    setMenuList(state, list) {
      state.menuList = Array.from(list);

      mappingRouter(routerList, flattenDeep(list));

      state.tabs = [];

      list.forEach((item) => {
        if (item.title && item.name && item.affix) {
          state.tabs.push({
            path: item.path,
            to: item.path,
            name: item.name,
            title: item.title,
            affix: true,
          });
        }
      });
    },
  },
};

export default layout;
