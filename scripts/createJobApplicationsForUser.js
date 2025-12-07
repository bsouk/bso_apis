/**
 * Script to create job applications for a logged-in user
 * Usage: node scripts/createJobApplicationsForUser.js <user_email>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/user');
const Job = require('../src/models/jobs');
const JobApplication = require('../src/models/job_applications');

const USER_EMAIL = process.argv[2] || 'ghufranjaleel@yopmail.com';

// Application statuses: 'pending', 'accepted', 'rejected', 'withdrawn'
const APPLICATION_STATUSES = ['pending', 'accepted', 'rejected', 'withdrawn'];

// Sample application data templates
const applicationTemplates = [
  {
    cover_letter: 'I am writing to express my strong interest in this position. With my extensive experience and passion for the field, I believe I would be a valuable addition to your team. I am excited about the opportunity to contribute to your company\'s success.',
    experience: '5+ years of professional experience in software development, with expertise in modern web technologies and agile methodologies.',
    resume: 'profile/resume-ghufran-jaleel.pdf',
    questions: [
      {
        question: 'Why are you interested in this position?',
        answer: 'I am passionate about this field and believe this role aligns perfectly with my career goals and skills.'
      },
      {
        question: 'What makes you a good fit for this role?',
        answer: 'My extensive experience, strong problem-solving skills, and ability to work in a team make me an ideal candidate.'
      }
    ],
    application_status: 'pending'
  },
  {
    cover_letter: 'Thank you for considering my application. I am thrilled about the possibility of joining your team. My background in product management and track record of successful project deliveries make me confident that I can contribute significantly to your organization.',
    experience: '4+ years of experience in product management, leading cross-functional teams and delivering successful products to market.',
    resume: 'profile/resume-ghufran-jaleel.pdf',
    questions: [
      {
        question: 'What is your approach to product development?',
        answer: 'I follow a user-centric approach, starting with thorough research and validation before moving to development.'
      }
    ],
    application_status: 'accepted'
  },
  {
    cover_letter: 'I am writing to apply for this position. I have been following your company\'s work and am impressed by your innovative approach. I would love to bring my skills and enthusiasm to your team.',
    experience: '3+ years of experience in UX design, creating intuitive and engaging user experiences for various digital products.',
    resume: 'profile/resume-ghufran-jaleel.pdf',
    questions: [
      {
        question: 'Can you describe your design process?',
        answer: 'I start with user research, create personas and journey maps, then move to wireframes and prototypes before final design.'
      }
    ],
    application_status: 'rejected'
  },
  {
    cover_letter: 'I am excited to apply for this position. My background in data analysis and strong analytical skills would allow me to make meaningful contributions to your team. I am eager to work with your talented team and help drive data-driven decisions.',
    experience: '2+ years of experience in data analysis, working with large datasets and creating insightful visualizations and reports.',
    resume: 'profile/resume-ghufran-jaleel.pdf',
    questions: [
      {
        question: 'What tools do you use for data analysis?',
        answer: 'I primarily use SQL, Python, and Tableau for data analysis and visualization.'
      }
    ],
    application_status: 'withdrawn'
  }
];

function generateApplicationId() {
  const id = Math.floor(Math.random() * 1000000);
  return `#${id}`;
}

async function createJobApplicationsForUser() {
  try {
    console.log('🚀 Starting job application creation script...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || process.env.DB_URL);
    console.log('✅ Connected to MongoDB\n');

    // Find user (candidate)
    const candidate = await User.findOne({ email: USER_EMAIL });
    
    if (!candidate) {
      console.error(`❌ User not found with email: ${USER_EMAIL}`);
      console.log('Please provide a valid user email as argument:');
      console.log('  node scripts/createJobApplicationsForUser.js user@example.com');
      process.exit(1);
    }

    console.log('✅ Candidate found:');
    console.log(`   ID: ${candidate._id.toString()}`);
    console.log(`   Email: ${candidate.email}`);
    console.log(`   Name: ${candidate.full_name || candidate.first_name} ${candidate.last_name || ''}\n`);

    // Find existing jobs - get any available jobs
    let existingJobs = await Job.find({ 
      status: { $in: ['active', 'inactive', 'expired'] }
    })
    .populate('company_id', 'email full_name company_data')
    .limit(20)
    .sort({ createdAt: -1 });

    // Filter to only include jobs with valid company_id
    existingJobs = existingJobs.filter(job => {
      if (!job.company_id) return false;
      // Check if company_id is populated or is an ObjectId
      const companyId = job.company_id._id || job.company_id;
      return companyId && mongoose.Types.ObjectId.isValid(companyId);
    });

    if (existingJobs.length === 0) {
      console.log('⚠️  No jobs with valid company_id found in the database');
      console.log('   Creating a test job first...\n');
      
      // Create a test company user for the job
      const testCompany = await User.findOne({ 
        user_type: { $in: ['company', 'recruiter'] },
        _id: { $ne: candidate._id }
      }) || await User.findOne({ 
        email: { $ne: USER_EMAIL }
      });

      if (!testCompany) {
        console.error('❌ No other users found to create jobs for');
        console.log('Please create some jobs first using:');
        console.log('  node scripts/createJobsForUser.js <recruiter_email>');
        process.exit(1);
      }

      // Create a test job
      const testJob = await Job.create({
        job_unique_id: `#${Math.floor(Math.random() * 1000000)}`,
        company_id: testCompany._id,
        job_title: 'Test Job for Applications',
        job_type: ['Full-Time'],
        job_location_type: 'Remote',
        job_description: 'This is a test job created for application testing.',
        responsibility: 'Test responsibilities',
        experience: 2,
        experience_type: 'experienced',
        skills: ['Testing'],
        salary: '$50,000 - $70,000',
        rate: 'Annually',
        vacancy: '1',
        location: 'Remote',
        status: 'active'
      });

      existingJobs = [await Job.findById(testJob._id).populate('company_id', 'email full_name company_data')];
      console.log(`✅ Created test job: ${testJob.job_title}\n`);
    }

    console.log(`✅ Found ${existingJobs.length} available jobs\n`);

    // Check for existing applications to avoid duplicates
    const existingApplications = await JobApplication.find({ 
      canditate_id: candidate._id 
    }).select('job_id');

    const existingJobIds = new Set(existingApplications.map(app => app.job_id.toString()));
    
    // Filter out jobs the candidate has already applied for
    const availableJobs = existingJobs.filter(job => 
      !existingJobIds.has(job._id.toString())
    );

    if (availableJobs.length === 0) {
      console.log('⚠️  Candidate has already applied for all available jobs');
      console.log('   Creating applications anyway (may result in duplicates)...\n');
    } else {
      console.log(`✅ Found ${availableJobs.length} jobs candidate hasn't applied for\n`);
    }

    // Create 3-4 job applications
    const applicationsToCreate = Math.min(applicationTemplates.length, availableJobs.length || existingJobs.length);
    const jobsToUse = availableJobs.length > 0 ? availableJobs : existingJobs;
    
    const createdApplications = [];
    
    for (let i = 0; i < applicationsToCreate; i++) {
      const template = applicationTemplates[i];
      const job = jobsToUse[i % jobsToUse.length];
      
      // Check if application already exists
      const existingApp = await JobApplication.findOne({
        job_id: job._id,
        canditate_id: candidate._id
      });

      if (existingApp) {
        console.log(`⚠️  Application already exists for job: ${job.job_title}`);
        console.log(`   Skipping...\n`);
        continue;
      }

      // Ensure company_id exists - handle both populated and non-populated cases
      let companyId;
      if (job.company_id && job.company_id._id) {
        companyId = job.company_id._id;
      } else if (job.company_id && typeof job.company_id === 'object' && job.company_id.toString) {
        companyId = job.company_id;
      } else if (job.company_id) {
        companyId = job.company_id;
      } else {
        console.log(`⚠️  Job "${job.job_title}" has no company_id, skipping...\n`);
        continue;
      }

      const applicationData = {
        application_id: generateApplicationId(),
        job_id: job._id,
        company_id: companyId,
        canditate_id: candidate._id,
        cover_letter: template.cover_letter,
        experience: template.experience,
        resume: template.resume,
        questions: template.questions,
        application_status: template.application_status,
        status: 'active',
        is_accepted_by_company: template.application_status === 'accepted'
      };

      try {
        const application = await JobApplication.create(applicationData);
        createdApplications.push(application);
        
        const companyName = job.company_id?.company_data?.name || 
                           job.company_id?.full_name || 
                           (typeof job.company_id === 'object' ? 'Company' : 'N/A');
        
        console.log(`✅ Created application ${i + 1}:`);
        console.log(`   Application ID: ${application.application_id}`);
        console.log(`   Job Title: ${job.job_title}`);
        console.log(`   Company: ${companyName}`);
        console.log(`   Status: ${application.application_status}`);
        console.log(`   Applied Date: ${application.createdAt.toLocaleDateString()}\n`);
      } catch (error) {
        console.error(`❌ Error creating application ${i + 1}:`, error.message);
        if (error.code === 11000) {
          console.log('   (Duplicate key error - application may already exist)\n');
        }
      }
    }

    console.log('\n📋 Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Successfully created ${createdApplications.length} job applications for: ${candidate.email}`);
    console.log(`\n📊 Application Status Distribution:`);
    const statusCount = {};
    createdApplications.forEach(app => {
      statusCount[app.application_status] = (statusCount[app.application_status] || 0) + 1;
    });
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✨ Job applications are now available in the dashboard!');
    console.log(`   Login to frontend and check: http://localhost:3000/my-account`);
    console.log(`   Navigate to "My Job Applied" tab to see the applications\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    process.exit(0);
  }
}

createJobApplicationsForUser();

