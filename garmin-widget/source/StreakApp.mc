import Toybox.Application;
import Toybox.WatchUi;

class StreakApp extends Application.AppBase {

    function initialize() {
        AppBase.initialize();
    }

    function getInitialView() as [Views] or [Views, InputDelegates] {
        var view = new StreakView();
        return [view, new StreakDelegate(view)];
    }
}
