import Toybox.WatchUi;

class StreakDelegate extends WatchUi.BehaviorDelegate {

    var view;

    function initialize(streakView) {
        BehaviorDelegate.initialize();
        view = streakView;
    }

    function onSelect() {
        if (view != null) {
            view.showDetail = !view.showDetail;
            WatchUi.requestUpdate();
        }
        return true;
    }
}
