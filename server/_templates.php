<?php
/**
 * Project templates (docs/PRODUCT-SPEC.md sections 6.4 and 7, "One reusable
 * project template"). One template per work type in the section 6.4 table.
 * Templates are code, not a table: there is nothing to edit in the CMS, and
 * changing a template means changing this file and uploading it.
 *
 * Each template holds:
 *   - tasks: starter tasks, each a title and a due date offset in days from the
 *     day the project is created (0 is that day)
 *   - assets: asset checklist items for project_assets (SQL 15), each a label
 *     and a note shown to the client
 *   - brief: the brief prompts. Deliverables and exclusions are left empty on
 *     purpose, because they are agreed with each client; the measurement rows
 *     go to project_measurements (SQL 16) with the label, target and method
 *     from the table's "Example measurement" column, kind technical and
 *     result NOT TESTED until someone checks them
 *
 * No template contains client data. Lengths stay within the limits of
 * tasks.title (300), assets.php (label 160, note 1000) and briefs.php (label
 * 200, target 500, method 1000); tests/server/project-templates.test.ts
 * checks every one. Pure data and one lookup: no database, no request state.
 */

const PROJECT_TEMPLATES = [
  'business_website' => [
    'name' => 'Business website',
    'summary' => 'A small business site with a working enquiry route.',
    'tasks' => [
      ['title' => 'Kick-off call: agree the page list and the enquiry route', 'offset_days' => 0],
      ['title' => 'Collect the client assets on the checklist', 'offset_days' => 3],
      ['title' => 'Design the home page and one inner page for approval', 'offset_days' => 10],
      ['title' => 'Build the agreed pages', 'offset_days' => 21],
      ['title' => 'Test the enquiry route, phone layout and keyboard use', 'offset_days' => 28],
      ['title' => 'Launch and record the handover', 'offset_days' => 35],
    ],
    'assets' => [
      ['label' => 'Logo, as SVG or large PNG', 'note' => 'The largest version you have. A transparent background helps.'],
      ['label' => 'Copy for each agreed page', 'note' => 'One document per page is fine. Mark anything that is still a draft.'],
      ['label' => 'Photos you own or have a licence for', 'note' => 'Tell us where each one came from, so it can be credited if needed.'],
      ['label' => 'Contact details to show on the site', 'note' => 'The phone number, email address and postal address you want shown publicly.'],
      ['label' => 'Domain and hosting account, described', 'note' => 'Tell us who holds each account. Never send a password here: we will arrange a safe handover.'],
    ],
    'brief' => [
      'deliverables' => '',
      'exclusions' => '',
      'measurements' => [
        [
          'label' => 'Agreed pages delivered',
          'target' => 'Every page on the agreed page list is live',
          'method' => 'Page inventory checked against the agreed list. Delivered pages do not prove conversion.',
        ],
        [
          'label' => 'Enquiry route works',
          'target' => 'A test enquiry reaches the agreed inbox',
          'method' => 'Synthetic acceptance check: a test enquiry with made-up details, and its arrival confirmed.',
        ],
        [
          'label' => 'Usable on a phone and by keyboard',
          'target' => 'Every agreed page works on a phone-sized screen and with the keyboard alone',
          'method' => 'Synthetic acceptance checks on each agreed page, on a phone-sized screen and keyboard only.',
        ],
      ],
    ],
  ],
  'ecommerce' => [
    'name' => 'Ecommerce',
    'summary' => 'An online shop with an agreed catalogue and a tested checkout.',
    'tasks' => [
      ['title' => 'Kick-off call: agree the catalogue scope and checkout cases', 'offset_days' => 0],
      ['title' => 'Collect the product data and photos', 'offset_days' => 5],
      ['title' => 'Set up the payment provider in sandbox mode', 'offset_days' => 10],
      ['title' => 'Build the catalogue and checkout', 'offset_days' => 25],
      ['title' => 'Run the agreed checkout cases in the sandbox', 'offset_days' => 32],
      ['title' => 'Launch and record the handover', 'offset_days' => 40],
    ],
    'assets' => [
      ['label' => 'Product list with prices and variants', 'note' => 'A spreadsheet with the name, price, variants and stock of each product is ideal.'],
      ['label' => 'Product photos', 'note' => 'Photos you own or have a licence for, named so each one matches its product.'],
      ['label' => 'Delivery and returns terms', 'note' => 'The wording customers should see, or the rules, and we will draft it for your approval.'],
      ['label' => 'Payment provider account, described', 'note' => 'Tell us which provider and who holds the account. Never send a password or key here.'],
      ['label' => 'Logo, as SVG or large PNG', 'note' => 'The largest version you have. A transparent background helps.'],
    ],
    'brief' => [
      'deliverables' => '',
      'exclusions' => '',
      'measurements' => [
        [
          'label' => 'Agreed catalogue scope published',
          'target' => 'Every product and category on the agreed list is live',
          'method' => 'Catalogue checked against the agreed list, with record references.',
        ],
        [
          'label' => 'Checkout cases pass',
          'target' => 'Each agreed checkout case completes as expected',
          'method' => 'Run in the payment provider\'s sandbox with test cards; outcomes and record references noted. Never real orders as test fixtures.',
        ],
      ],
    ],
  ],
  'website_care' => [
    'name' => 'Website care',
    'summary' => 'An agreed fix or change on a site already in care.',
    'tasks' => [
      ['title' => 'Confirm the reported issue and the agreed outcome', 'offset_days' => 0],
      ['title' => 'Reproduce the issue and note the steps', 'offset_days' => 1],
      ['title' => 'Fix the issue and check the result', 'offset_days' => 3],
      ['title' => 'Record the handover and ask the client to confirm', 'offset_days' => 5],
      ['title' => 'Set the next review date', 'offset_days' => 7],
    ],
    'assets' => [
      ['label' => 'Description of the issue', 'note' => 'What happened, on which page and when. A screenshot helps.'],
      ['label' => 'Site access, described', 'note' => 'Tell us who holds the login. Never send a password here.'],
    ],
    'brief' => [
      'deliverables' => '',
      'exclusions' => '',
      'measurements' => [
        [
          'label' => 'Agreed issue resolved',
          'target' => 'The reported issue no longer happens',
          'method' => 'The reproduction steps run before the fix and again after it, with the result noted.',
        ],
        [
          'label' => 'Handover recorded',
          'target' => 'The client acknowledges the result and a next review date is set',
          'method' => 'Client acknowledgement kept in Messages or Files, with the next review date.',
        ],
      ],
    ],
  ],
  'it_support' => [
    'name' => 'General IT support',
    'summary' => 'A reported issue resolved, explained and timed.',
    'tasks' => [
      ['title' => 'Log the reported issue as a ticket', 'offset_days' => 0],
      ['title' => 'Reproduce the issue', 'offset_days' => 1],
      ['title' => 'Fix the issue and write the fix note', 'offset_days' => 2],
      ['title' => 'Explain the cause to the client', 'offset_days' => 3],
      ['title' => 'Record the time spent and ask the client to confirm', 'offset_days' => 3],
    ],
    'assets' => [
      ['label' => 'Description of the issue', 'note' => 'What happened, on which device and when. A screenshot or the exact error message helps.'],
      ['label' => 'Device and software details', 'note' => 'The make, model and system version, and the software involved.'],
      ['label' => 'Account access, described', 'note' => 'Tell us which account is involved and who holds it. Never send a password here.'],
    ],
    'brief' => [
      'deliverables' => '',
      'exclusions' => '',
      'measurements' => [
        [
          'label' => 'Reported issue resolved',
          'target' => 'The issue no longer happens',
          'method' => 'Ticket with the reproduction, fix note and the client\'s confirmation. No networking or hardware repair.',
        ],
        [
          'label' => 'Cause explained',
          'target' => 'The client has a plain explanation of the cause',
          'method' => 'Explanation written in the ticket and confirmed by the client.',
        ],
        [
          'label' => 'Time spent recorded',
          'target' => 'Every hour worked is a time entry on the client\'s IT support project',
          'method' => 'Time entries checked against the ticket.',
        ],
      ],
    ],
  ],
  'it_consultancy' => [
    'name' => 'IT consultancy',
    'summary' => 'Agreed questions answered in a written recommendation.',
    'tasks' => [
      ['title' => 'Agree the questions to answer', 'offset_days' => 0],
      ['title' => 'Gather the information needed', 'offset_days' => 5],
      ['title' => 'Draft the written recommendation', 'offset_days' => 12],
      ['title' => 'Deliver the recommendation as a shared file', 'offset_days' => 15],
      ['title' => 'Record the client\'s acknowledgement and any follow-up date', 'offset_days' => 20],
    ],
    'assets' => [
      ['label' => 'Background documents', 'note' => 'Anything that explains the current set-up: diagrams, contracts or earlier reports.'],
      ['label' => 'List of current tools and services', 'note' => 'The software and services in use, and roughly how many people use each.'],
    ],
    'brief' => [
      'deliverables' => '',
      'exclusions' => '',
      'measurements' => [
        [
          'label' => 'Agreed questions answered',
          'target' => 'Each agreed question has a written answer',
          'method' => 'Written recommendation delivered as a shared file, with the client\'s acknowledgement and a follow-up date if any.',
        ],
      ],
    ],
  ],
];

/** The template for a key, or null when there is no such template. */
function project_template(string $key): ?array {
  return PROJECT_TEMPLATES[$key] ?? null;
}

/** Every template as a list, in the order of the section 6.4 table, for the "Start from template" picker. */
function project_template_list(): array {
  $out = [];
  foreach (PROJECT_TEMPLATES as $key => $t) $out[] = ['key' => $key] + $t;
  return $out;
}
