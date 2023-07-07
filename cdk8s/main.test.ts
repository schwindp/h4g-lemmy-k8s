import {Testing} from 'cdk8s';
import {LemmyChart} from "./lemmy";
import {appProps} from "./app-props";

describe('Snapshots', () => {
  test('Example', () => {
    const app = Testing.app();
    const chart = new LemmyChart(app, 'lemmy', appProps);
    const results = Testing.synth(chart)
    expect(results).toMatchSnapshot();
  });
});
