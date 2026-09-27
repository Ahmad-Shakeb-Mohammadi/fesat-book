import { PullToRefresh } from "../refreshEvent.js";

let pullToRefresh = null;
let infinitScroll = null;

export function initPullToRefresh(refreshCallback, threshold = 80) {
    destroyPullToRefresh();
    pullToRefresh = new PullToRefresh({
        onRefresh: refreshCallback,
        threshold
    });
}

export function destroyPullToRefresh() {
    if (pullToRefresh) {
        pullToRefresh.destroy();
        pullToRefresh = null;
    }
}

export function setInfinitScroll(instance) {
    infinitScroll = instance;
}

export function destroyInfinitScroll() {
    if (infinitScroll) {
        infinitScroll.destroy();
        infinitScroll = null;
    }
}

export function destroyAll() {
    destroyPullToRefresh();
    destroyInfinitScroll();
}