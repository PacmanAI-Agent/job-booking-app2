// ==== CONFIG – put your Airtable details here ====
const AIRTABLE_API_KEY = 'YOUR_A…_KEY';
const BASE_ID       = 'appX0OtnSWt8JOKvh';
const TABLE_ID      = 'tblHkIbvRNOcx6lVQ';   // Fleet Management table

// ====================================================

const form = document.getElementById('bookingForm');
const companyInput = document.getElementById('company');
const companyName = companyInput ? companyInput.value : '';
const statusEl = document.getElementById('status');
const jobsContainer = document.getElementById('jobs-container');
const addJobBtn = document.getElementById('addJobBtn');

let jobCount = 1;

// Set default date to today on page load
function initDatePicker() {
  const dateInput = document.getElementById('date-picker');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
}

// Add another job entry
addJobBtn.addEventListener('click', function() {
  jobCount++;
  
  const jobDiv = document.createElement('div');
  jobDiv.className = 'job-entry';
  jobDiv.innerHTML = `
    <h3>Job #${jobCount}</h3>
    <button type="button" class="remove-job" onclick="this.parentElement.remove()">Remove</button>
    
    <label for="destination_${jobCount}">Company Destination</label>
    <input type="text" id="destination_${jobCount}" name="Destination" placeholder="e.g. 123 Main St" required>

    <label for="address_${jobCount}">Address (optional)</label>
    <input type="text" id="address_${jobCount}" name="Address" placeholder="e.g. Suite 5, 456 Oak Ave">

    <label for="description_${jobCount}">Description</label>
    <textarea id="description_${jobCount}" name="Description" rows="3" placeholder="Job details" required></textarea>

    <div class="checkboxes">
      <label><input type="checkbox" name="PickUp_${jobCount}" value="Yes"> Pick-up</label>
      <label><input type="checkbox" name="DropOff_${jobCount}" value="Yes"> Drop-off</label>
    </div>

    <label for="phone_${jobCount}">Phone (optional)</label>
    <input type="tel" id="phone_${jobCount}" name="Phone" placeholder="e.g. 022 370 3540">

    <label for="attachments_${jobCount}">Attachments (photos / docs)</label>
    <input type="file" id="attachments_${jobCount}" name="Attachments" accept="image/*,application/pdf" multiple>
  `;
  
  jobsContainer.appendChild(jobDiv);
});

// Also need to handle the first job's checkboxes properly
// Override submit to handle multiple jobs
form.addEventListener('submit', async e => {
  e.preventDefault();
  statusEl.textContent = 'Sending...';

  const formData = new FormData(form);
  const dateValue = formData.get('Date');
  const company = formData.get('Company');

  // Get all job entries
  const jobEntries = document.querySelectorAll('.job-entry');
  const jobs = [];

  for (const entry of jobEntries) {
    const destInput = entry.querySelector('[name="Destination"]');
    const addrInput = entry.querySelector('[name="Address"]');
    const descInput = entry.querySelector('[name="Description"]');
    const phoneInput = entry.querySelector('[name="Phone"]');
    const pickupCb = entry.querySelector('input[name^="PickUp"]');
    const dropoffCb = entry.querySelector('input[name^="DropOff"]');
    const fileInput = entry.querySelector('input[type="file"]');
    
    if (destInput && destInput.value) {
      const job = {
        Destination: destInput.value,
        Address: addrInput ? addrInput.value : '',
        Description: descInput ? descInput.value : '',
        Phone: phoneInput ? phoneInput.value : '',
        Date: dateValue,
        Company: company,
        PickUp: pickupCb && pickupCb.checked ? 'Yes' : 'No',
        DropOff: dropoffCb && dropoffCb.checked ? 'Yes' : 'No'
      };
      
      // Handle attachments
      if (fileInput && fileInput.files.length > 0) {
        try {
          const uploaded = await Promise.all(Array.from(fileInput.files).map(uploadFile));
          job.Attachments = uploaded.map(u => ({url: u}));
        } catch (err) {
          console.error('Upload error:', err);
        }
      }
      
      jobs.push(job);
    }
  }

  if (jobs.length === 0) {
    statusEl.textContent = 'Please fill in at least one job';
    return;
  }

  try {
    // Submit each job to Airtable
    await Promise.all(jobs.map(job => submitJob(job)));
    statusEl.textContent = `✅ ${jobs.length} job(s) booked!`;
    form.reset();
    // Reset to single job
    jobsContainer.innerHTML = document.querySelector('.job-entry').outerHTML;
    jobCount = 1;
    initDatePicker();
  } catch (err) {
    console.error(err);
    statusEl.textContent = '❌ Failed – check console';
  }
});

async function submitJob(fields) {
  const resp = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({fields})
  });
  if (!resp.ok) throw new Error(`Airtable error ${resp.status}`);
  return resp.json();
}

// Helper – upload a file to Airtable's attachment endpoint
async function uploadFile(file) {
  const uploadResp = await fetch('https://api.airtable.com/v0/meta/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    body: file
  });
  if (!uploadResp.ok) throw new Error('Upload failed');
  const json = await uploadResp.json();
  return json.url;
}

// Initialize
document.addEventListener('DOMContentLoaded', initDatePicker);