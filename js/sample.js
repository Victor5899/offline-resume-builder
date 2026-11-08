(function (root) {
  "use strict";

  var RB = root.ResumeBuilder = root.ResumeBuilder || {};

  function section(type, id, fill) {
    var next = RB.createSection(type);
    next.id = id;
    fill(next);
    return next;
  }

  function createSampleResume() {
    var personal = section("personal", "sec-personal", function (block) {
      block.fields.fullName = "Meera Iyer";
      block.fields.headline = "Computer Science student";
      block.fields.email = "meera.iyer@example.com";
      block.fields.phone = "+91 98220 44118";
      block.fields.location = "Pune, India";
      block.fields.website = "https://example.com/meera";
      block.fields.linkedin = "https://example.com/in/meera-iyer";
      block.fields.github = "https://example.com/meera-iyer";
    });

    var summary = section("summary", "sec-summary", function (block) {
      block.fields.text = "Final-year computer science student who builds plain, dependable web software. Seeking a junior developer role.";
    });

    var education = section("education", "sec-education", function (block) {
      block.entries = [
        {
          id: "edu-1",
          institution: "Rivermark Institute of Technology",
          credential: "B.Tech in Computer Science",
          location: "Pune",
          start: "2022",
          end: "2026",
          details: "CGPA 8.6/10. Coursework in data structures, databases, and operating systems."
        },
        {
          id: "edu-2",
          institution: "Cedar Grove Junior College",
          credential: "Class XII, Science",
          location: "Nashik",
          start: "2020",
          end: "2022",
          details: "94% in computer science and mathematics."
        }
      ];
    });

    var skills = section("skills", "sec-skills", function (block) {
      block.entries = [
        { id: "skill-1", category: "Languages", items: ["JavaScript", "Python", "Java", "SQL"] },
        { id: "skill-2", category: "Web", items: ["HTML", "CSS", "DOM scripting", "Responsive layout"] },
        { id: "skill-3", category: "Tools", items: ["Git", "Linux", "Chrome DevTools"] }
      ];
    });

    var experience = section("experience", "sec-experience", function (block) {
      block.entries = [
        {
          id: "exp-1",
          role: "Software Engineering Intern",
          organization: "Northwind Labs",
          location: "Pune",
          start: "May 2025",
          end: "Jul 2025",
          highlights: [
            "Shipped an internal leave-request page with validation and a printable summary.",
            "Rewrote field order and error text after watching five colleagues use the draft."
          ]
        },
        {
          id: "exp-2",
          role: "Technical Team Member",
          organization: "Campus Systems Club",
          location: "Pune",
          start: "Aug 2024",
          end: "Apr 2025",
          highlights: [
            "Repaired keyboard focus on the registration form and kept the event list updated."
          ]
        }
      ];
    });

    var projects = section("projects", "sec-projects", function (block) {
      block.entries = [
        {
          id: "proj-1",
          name: "Study Planner",
          url: "https://example.com/study-planner",
          technologies: "HTML, CSS, JavaScript",
          highlights: [
            "Offline timetable that stores entries locally and flags clashes."
          ]
        },
        {
          id: "proj-2",
          name: "Library Desk Log",
          url: "https://example.com/library-desk",
          technologies: "Python, SQLite",
          highlights: [
            "Check-out, return, and overdue list for a department library, with sample data."
          ]
        }
      ];
    });

    var certifications = section("certifications", "sec-certifications", function (block) {
      block.entries = [
        {
          id: "cert-1",
          name: "Responsive Web Design",
          issuer: "Example Learning Co-op",
          date: "Jun 2025",
          url: "https://example.com/certs/responsive-web-design"
        },
        {
          id: "cert-2",
          name: "SQL Basics",
          issuer: "Rivermark Continuing Education",
          date: "Jan 2025",
          url: ""
        }
      ];
    });

    var achievements = section("achievements", "sec-achievements", function (block) {
      block.entries = [
        {
          id: "ach-1",
          title: "Department coding contest, second place",
          description: "Nov 2024. Solved four of five problems, including a course-prerequisite graph."
        },
        {
          id: "ach-2",
          title: "School science exhibition, best exhibit",
          description: "Feb 2022. A quiz board that stored scores on a microcontroller."
        }
      ];
    });

    var responsibilities = section("responsibilities", "sec-responsibilities", function (block) {
      block.entries = [
        {
          id: "resp-1",
          role: "Treasurer",
          organization: "Computer Science Student Association",
          start: "Jun 2024",
          end: "May 2025",
          highlights: [
            "Published a one-page balance after each event and coordinated an 80-student workshop."
          ]
        }
      ];
    });

    var additional = section("additional", "sec-additional", function (block) {
      block.entries = [
        { id: "add-1", label: "Languages", value: "English, Hindi, Tamil" },
        { id: "add-2", label: "Interests", value: "Distance running, hand-lettering" }
      ];
    });

    return {
      version: RB.DOCUMENT_VERSION,
      template: "classic",
      sections: [
        personal,
        summary,
        education,
        skills,
        experience,
        projects,
        certifications,
        achievements,
        responsibilities,
        additional
      ]
    };
  }

  RB.createSampleResume = createSampleResume;
})(typeof window !== "undefined" ? window : globalThis);
