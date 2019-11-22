import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click, triggerKeyEvent, fillIn } from '@ember/test-helpers';
import { clickTrigger } from 'ember-basic-dropdown/test-support/helpers';
import setupMirage from 'ember-cli-mirage/test-support/setup-mirage';
import hbs from 'htmlbars-inline-precompile';

let Store, MetadataService, AdClicks, PageViews, Age;

module('Integration | Component | navi-request-preview', function(hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function() {
    Store = this.owner.lookup('service:store');
    MetadataService = this.owner.lookup('service:bard-metadata');

    return MetadataService.loadMetadata().then(() => {
      AdClicks = MetadataService.getById('metric', 'adClicks');
      PageViews = MetadataService.getById('metric', 'pageViews');
      Age = MetadataService.getById('dimension', 'age');
      //set request object
      this.set(
        'request',
        Store.createFragment('bard-request/request', {
          logicalTable: Store.createFragment('bard-request/fragments/logicalTable', {
            table: MetadataService.getById('table', 'tableA'),
            timeGrainName: 'day'
          }),
          metrics: [
            {
              metric: AdClicks,
              parameters: {
                adType: 'BannerAds'
              }
            },
            {
              metric: AdClicks,
              parameters: {
                adType: 'VideoAds'
              }
            },
            {
              metric: PageViews,
              parameters: {}
            }
          ],
          dimensions: [
            {
              dimension: Age
            }
          ],
          sort: [
            Store.createFragment('bard-request/fragments/sort', {
              metric: Store.createFragment('bard-request/fragments/metric', {
                metric: AdClicks,
                parameters: {
                  adType: 'BannerAds'
                }
              }),
              direction: 'asc'
            })
          ]
        })
      );
    });
  });

  test('columns render and options work properly', async function(assert) {
    assert.expect(17);

    const textContentArray = selector => [...document.querySelectorAll(selector)].map(el => el.textContent.trim());

    this.set('visualization', { metadata: {} });
    this.set('onRemoveMetric', fragment => {
      assert.equal(fragment.longName, 'Ad Clicks', 'onRemoveMetric is called with a metric column');
    });
    this.set('onRemoveDimension', fragment => {
      assert.equal(fragment.longName, 'Age', 'onRemoveDimension is called with a metric column');
    });
    this.set('onRemoveTimeGrain', fragment => {
      assert.equal(fragment.longName, 'Day', 'onRemoveTimeGrain is called with a dateTime column');
    });
    this.set('onAddSort', (columnName, direction) => {
      assert.ok(typeof columnName === 'string', 'Column name is passed as a string to onAddSort action');
      assert.ok(['asc', 'desc', 'none'].includes(direction), 'Direction is sent as one of the valid values');
    });
    this.set('onRemoveSort', columnName => {
      assert.ok(typeof columnName === 'string', 'Column name is passed as a string to onRemoveSort action');
    });

    await render(hbs`
      <NaviRequestPreview
        @request={{this.request}}
        @visualization={{this.visualization}}
        @onRemoveMetric={{action onRemoveMetric}}
        @onRemoveDimension={{action onRemoveDimension}}
        @onRemoveTimeGrain={{action onRemoveTimeGrain}}
        @onAddSort={{action onAddSort}}
        @onRemoveSort={{action onRemoveSort}}
      />
    `);

    assert.deepEqual(
      textContentArray('.navi-request-preview__column-header'),
      ['Date', 'Age', 'Ad Clicks (BannerAds)', 'Ad Clicks (VideoAds)', 'Page Views'],
      'Column headers are generated correctly for each column in the request'
    );

    assert.deepEqual(
      textContentArray('.navi-request-preview__column-header--dateTime'),
      ['Date'],
      'Date class is applied to the date column only'
    );

    assert.deepEqual(
      textContentArray('.navi-request-preview__column-header--dimension'),
      ['Age'],
      'Dimension class is applied to the dimension column only'
    );

    assert.deepEqual(
      textContentArray('.navi-request-preview__column-header--metric'),
      ['Ad Clicks (BannerAds)', 'Ad Clicks (VideoAds)', 'Page Views'],
      'Metric class is applied to only the metric columns'
    );

    // Click the first metric column options
    await clickTrigger(
      '.navi-request-preview__column-header--metric>.navi-request-preview__column-header-options-trigger'
    );

    assert.deepEqual(
      textContentArray('.navi-request-preview__column-header-option'),
      ['Remove', 'Edit'],
      'Remove and Edit options are present in the options list'
    );

    // Click remove
    await click('.navi-request-preview__column-header-option:first-of-type');

    // Click the first dimension column options and click remove
    await clickTrigger(
      '.navi-request-preview__column-header--dimension>.navi-request-preview__column-header-options-trigger'
    );
    await click('.navi-request-preview__column-header-option:first-of-type');

    // Click the dateTime column options and click remove
    await clickTrigger(
      '.navi-request-preview__column-header--dateTime>.navi-request-preview__column-header-options-trigger'
    );
    await click('.navi-request-preview__column-header-option:first-of-type');

    // Click the first metric column options and click edit
    await clickTrigger(
      '.navi-request-preview__column-header--metric>.navi-request-preview__column-header-options-trigger'
    );
    await click('.navi-request-preview__column-header-option:last-of-type');

    assert.dom('.navi-request-column-config').isVisible('Column config opens on edit option click');
    assert.dom('#columnName').hasValue('Ad Clicks (BannerAds)', 'Selected column name is displayed in input');

    await fillIn('#columnName', 'Banner Ad Clicks');
    await triggerKeyEvent('#columnName', 'keyup', 13);

    assert.dom('#columnName').hasValue('Banner Ad Clicks', 'Updated column name is in the input field');
    assert.deepEqual(
      textContentArray('.navi-request-preview__column-header'),
      ['Date', 'Age', 'Banner Ad Clicks', 'Ad Clicks (VideoAds)', 'Page Views'],
      'Only the selected column has the updated name'
    );

    // Click the first dimension column options and click edit
    await clickTrigger(
      '.navi-request-preview__column-header--dimension>.navi-request-preview__column-header-options-trigger'
    );
    await click('.navi-request-preview__column-header-option:last-of-type');

    assert
      .dom('.navi-request-column-config')
      .isVisible("Column config stays open when a different column's edit option is clicked");
    assert.dom('#columnName').hasValue('Age', 'Selected column name is updated and displayed in input');

    await click('.navi-request-preview__column-header--metric>.navi-request-preview__column-header-sort');
    await click('.navi-request-preview__column-header--metric:last-of-type>.navi-request-preview__column-header-sort');
  });
});
